import pLimit from "p-limit";
import { UnifiedCache, CacheNamespace } from "../cache/unifiedCache";
import { safeExecute } from "../utils/fetch";
import type {
  MergedLinks,
  SearchMatchMode,
  SearchResponse,
  SearchResult,
} from "../types/models";
import { PluginManager, type AsyncSearchPlugin } from "../plugins/manager";
import {
  PluginHealthChecker,
  createPluginHealthChecker,
} from "../plugins/pluginHealth";
import {
  ErrorCollector,
  classifyError,
  type WarningInfo,
} from "../utils/errors";
import {
  buildSearchKeywordVariants,
  matchesExactSearchKeyword,
} from "../utils/searchKeyword";
import { buildSearchAliasVariants } from "../utils/searchAliases";
import { sortMergedLinksByRelevance } from "./searchRanking";
import { loggers } from "../utils/logger";
import { isStrictTitleMatch } from "../../../utils/sourceContent";
import type { SourceQualityPolicy } from "./searchQualityService";
import { resolveMovieSearchAliases } from "./movieSearchAliases";
import {
  enrichTorrentMetadata,
  mergeTorrentMetadata,
  normalizeMagnetKey,
  scoreTorrentResult,
} from "../../../utils/torrentMetadata";

export interface SearchServiceOptions {
  priorityChannels: string[];
  defaultChannels: string[];
  defaultConcurrency: number;
  pluginTimeoutMs: number;
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
}

export interface SourceExecutionMetric {
  sourceKey: string;
  resultCount: number;
  uniqueResultCount: number;
  duplicateCount: number;
  latencyMs: number;
  success: boolean;
  timedOut: boolean;
  cached: boolean;
}

export interface SearchExecutionResult {
  response: SearchResponse;
  warnings: WarningInfo[];
  sourceMetrics: SourceExecutionMetric[];
}

export class SearchService {
  private static readonly TG_PRIORITY_CHANNEL_LIMIT = 40;
  private static readonly TG_CHANNEL_LIMIT = 20;
  private static readonly PLUGIN_VARIANT_TRIGGER = 5;
  private static readonly MAX_PLUGIN_QUERY_VARIANTS = 3;

  private options: SearchServiceOptions;
  private pluginManager: PluginManager;
  private cache: UnifiedCache;
  private healthChecker: PluginHealthChecker;

  constructor(options: SearchServiceOptions, pluginManager: PluginManager) {
    this.options = options;
    this.pluginManager = pluginManager;
    this.cache = new UnifiedCache(
      {
        enabled: options.cacheEnabled,
        ttlMinutes: options.cacheTtlMinutes,
      },
      "search"
    );

    this.healthChecker = createPluginHealthChecker();
  }

  getPluginManager() {
    return this.pluginManager;
  }

  async search(
    keyword: string,
    channels: string[] | undefined,
    concurrency: number | undefined,
    forceRefresh: boolean | undefined,
    resultType: string | undefined,
    sourceType: "all" | "tg" | "plugin" | undefined,
    plugins: string[] | undefined,
    cloudTypes: string[] | undefined,
    ext: Record<string, any> | undefined,
    signal?: AbortSignal,
    matchMode: SearchMatchMode = "fuzzy"
  ): Promise<SearchResponse> {
    const { response } = await this.searchWithWarnings(
      keyword,
      channels,
      concurrency,
      forceRefresh,
      resultType,
      sourceType,
      plugins,
      cloudTypes,
      ext,
      signal,
      matchMode
    );

    return response;
  }

  async searchWithWarnings(
    keyword: string,
    channels: string[] | undefined,
    concurrency: number | undefined,
    forceRefresh: boolean | undefined,
    resultType: string | undefined,
    sourceType: "all" | "tg" | "plugin" | undefined,
    plugins: string[] | undefined,
    cloudTypes: string[] | undefined,
    ext: Record<string, any> | undefined,
    signal?: AbortSignal,
    matchMode: SearchMatchMode = "fuzzy"
  ): Promise<SearchExecutionResult> {
    // 客户端已断开，直接返回空结果
    if (signal?.aborted) {
      return { response: { total: 0 }, warnings: [], sourceMetrics: [] };
    }

    const errorCollector = new ErrorCollector();
    const sourceMetrics: SourceExecutionMetric[] = [];
    const requestStart = Date.now();
    const effChannels =
      channels && channels.length > 0 ? channels : this.options.defaultChannels;
    const effConcurrency =
      concurrency && concurrency > 0
        ? concurrency
        : this.options.defaultConcurrency;
    const effResultType =
      !resultType || resultType === "merge" ? "merged_by_type" : resultType;
    const effSourceType = sourceType ?? "all";
    const effMatchMode: SearchMatchMode =
      matchMode === "exact" ? "exact" : "fuzzy";

    let tgResults: SearchResult[] = [];
    let pluginResults: SearchResult[] = [];

    const tasks: Array<() => Promise<void>> = [];

    if (effSourceType === "all" || effSourceType === "tg") {
      tasks.push(async () => {
        const startedAt = Date.now();
        const concOverride =
          typeof concurrency === "number" && concurrency > 0
            ? concurrency
            : undefined;
        tgResults = await this.searchTG(
          keyword,
          effChannels,
          !!forceRefresh,
          concOverride,
          ext,
          signal
        );
        sourceMetrics.push({
          sourceKey: "tg",
          resultCount: tgResults.length,
          uniqueResultCount: tgResults.length,
          duplicateCount: 0,
          latencyMs: Date.now() - startedAt,
          success: true,
          timedOut: false,
          cached: false,
        });
      });
    }
    if (effSourceType === "all" || effSourceType === "plugin") {
      tasks.push(async () => {
        pluginResults = await this.searchPlugins(
          keyword,
          plugins,
          !!forceRefresh,
          effConcurrency,
          { ...(ext ?? {}), __cloud_types: cloudTypes },
          errorCollector,
          sourceMetrics,
          signal,
          effMatchMode
        );
      });
    }

    await Promise.all(tasks.map((task) => task()));

    const allResults = this.mergeSearchResults(tgResults, pluginResults);
    const matchedResults =
      effMatchMode === "exact"
        ? allResults.filter((result) =>
            this.matchesExactResult(result, keyword)
          )
        : allResults;
    this.sortResultsByTimeDesc(matchedResults);

    const filteredForResults: SearchResult[] = [];
    for (const result of matchedResults) {
      const hasTime = !!result.datetime;
      const hasLinks = Array.isArray(result.links) && result.links.length > 0;
      if (hasTime || hasLinks) {
        filteredForResults.push(result);
      }
    }

    const mergedLinks = this.mergeResultsByType(
      matchedResults,
      keyword,
      cloudTypes
    );

    let total = 0;
    let response: SearchResponse = { total: 0 };
    if (effResultType === "merged_by_type") {
      total = Object.values(mergedLinks).reduce(
        (sum, items) => sum + items.length,
        0
      );
      response = { total, merged_by_type: mergedLinks };
    } else if (effResultType === "results") {
      total = filteredForResults.length;
      response = { total, results: filteredForResults };
    } else {
      total = filteredForResults.length;
      response = {
        total,
        results: filteredForResults,
        merged_by_type: mergedLinks,
      };
    }

    const requestMs = Date.now() - requestStart;
    loggers.search.debug("搜索请求完成", {
      keyword,
      total,
      tgCount: tgResults.length,
      pluginSources: pluginResults.length,
      sourceType: effSourceType,
      requestedPlugins: plugins ?? "all",
      requestedChannels: effChannels.length,
      matchMode: effMatchMode,
      exactFilteredCount: allResults.length - matchedResults.length,
      durationMs: requestMs,
      filteredResultCount: filteredForResults.length,
    });

    return {
      response,
      warnings: errorCollector.getWarnings(),
      sourceMetrics,
    };
  }

  private async searchTG(
    keyword: string,
    channels: string[] | undefined,
    forceRefresh: boolean,
    concurrencyOverride?: number,
    ext?: Record<string, any>,
    signal?: AbortSignal
  ): Promise<SearchResult[]> {
    const chList = Array.isArray(channels) ? channels : [];
    const cacheKey = `tg:${keyword}:${[...chList].sort().join(",")}`;
    const { cacheEnabled, priorityChannels } = this.options;

    if (!forceRefresh && cacheEnabled) {
      const cached = this.cache.get(CacheNamespace.TG_SEARCH, cacheKey);
      if (cached.hit && cached.value) {
        return cached.value;
      }
    }

    const { fetchTgChannelPosts } = await import("./tg");
    const requestedTimeout = Number((ext as any)?.__plugin_timeout_ms) || 0;
    const timeoutMs = Math.max(
      3000,
      requestedTimeout > 0
        ? requestedTimeout
        : this.options.pluginTimeoutMs || 0
    );
    const concurrency = Math.max(
      2,
      Math.min(concurrencyOverride ?? this.options.defaultConcurrency, 6)
    );
    const batchDeadline = Date.now() + timeoutMs;

    const prioritySet = new Set(priorityChannels || []);
    const priorityList = chList.filter((channel) => prioritySet.has(channel));
    const normalList = chList.filter((channel) => !prioritySet.has(channel));

    const createChannelTask =
      (channel: string, limitPerChannel: number) => async () => {
        // 客户端断开时跳过
        if (signal?.aborted) return [];
        const remainingBudgetMs = batchDeadline - Date.now();
        if (remainingBudgetMs <= 0) return [];

        const controller = new AbortController();
        // 将外部取消和超时合并：任一触发都会 abort
        const mergedSignal = signal
          ? AbortSignal.any([signal, controller.signal])
          : controller.signal;

        const result = await safeExecute(
          () =>
            this.withTimeout<SearchResult[]>(
              fetchTgChannelPosts(channel, keyword, {
                limitPerChannel,
                signal: mergedSignal,
              }),
              remainingBudgetMs,
              [],
              controller
            ),
          []
        );
        return result;
      };

    const flattenResults = (items: SearchResult[][]) => {
      const flattened: SearchResult[] = [];
      for (const arr of items) {
        if (Array.isArray(arr)) {
          flattened.push(...arr);
        }
      }
      return flattened;
    };

    const channelTasks = [
      ...priorityList.map((channel) =>
        createChannelTask(channel, SearchService.TG_PRIORITY_CHANNEL_LIMIT)
      ),
      ...normalList.map((channel) =>
        createChannelTask(channel, SearchService.TG_CHANNEL_LIMIT)
      ),
    ];
    const results = flattenResults(
      await this.runWithConcurrency(channelTasks, concurrency, signal)
    );

    if (cacheEnabled && results.length > 0) {
      this.cache.set(CacheNamespace.TG_SEARCH, cacheKey, results);
    }

    loggers.search.debug("TG 搜索汇总", {
      keyword,
      channelCount: chList.length,
      priorityCount: priorityList.length,
      normalCount: normalList.length,
      resultCount: results.length,
    });

    return results;
  }

  private async searchPlugins(
    keyword: string,
    plugins: string[] | undefined,
    forceRefresh: boolean,
    concurrency: number,
    ext: Record<string, any>,
    errorCollector: ErrorCollector,
    sourceMetrics: SourceExecutionMetric[],
    signal?: AbortSignal,
    matchMode: SearchMatchMode = "fuzzy"
  ): Promise<SearchResult[]> {
    const cloudTypeKey = Array.isArray(ext.__cloud_types)
      ? ext.__cloud_types.map(String).filter(Boolean).sort().join(",")
      : "all";
    const cacheKey = `plugin:${matchMode}:${keyword}:${cloudTypeKey}:${(plugins ?? [])
      .map((plugin) => plugin?.toLowerCase())
      .filter(Boolean)
      .sort()
      .join(",")}`;
    const { cacheEnabled } = this.options;

    if (!forceRefresh && cacheEnabled) {
      const cached = this.cache.get(CacheNamespace.PLUGIN_SEARCH, cacheKey);
      if (cached.hit && cached.value) {
        if (plugins?.length === 1 && plugins[0]) {
          sourceMetrics.push({
            sourceKey: plugins[0],
            resultCount: 0,
            uniqueResultCount: 0,
            duplicateCount: 0,
            latencyMs: 0,
            success: true,
            timedOut: false,
            cached: true,
          });
        }
        return cached.value;
      }
    }

    const allPlugins = this.pluginManager.getPlugins();
    const policies = (ext.__source_quality_policies || {}) as Record<
      string,
      SourceQualityPolicy
    >;
    const policyFor = (pluginName: string) =>
      policies[pluginName.trim().toLowerCase()];
    const explicitlyRequested = Boolean(
      plugins && plugins.length > 0 && plugins.some((plugin) => !!plugin)
    );
    const healthyPlugins = allPlugins.filter((plugin) =>
      this.healthChecker.isHealthy(plugin.name())
    );

    let available: AsyncSearchPlugin[] = [];
    if (explicitlyRequested) {
      const wanted = new Set(
        (plugins || []).map((plugin) => plugin.toLowerCase())
      );
      available = healthyPlugins.filter((plugin) =>
        wanted.has(plugin.name().toLowerCase())
      );
    } else {
      available = healthyPlugins;
    }
    // The web client sends its enabled source list explicitly but opts into
    // automatic quality controls. Direct API callers can still probe a
    // specific disabled source by omitting this internal flag.
    if (!explicitlyRequested || ext.__respect_source_quality === true) {
      available = available.filter(
        (plugin) => policyFor(plugin.name())?.state !== "disabled"
      );
    }
    available.sort((left, right) => {
      const scoreDelta =
        (policyFor(right.name())?.score ?? 50) -
        (policyFor(left.name())?.score ?? 50);
      return scoreDelta || left.priority() - right.priority();
    });

    const staticAliases = buildSearchAliasVariants(keyword, 3);
    const needsMovieAlias =
      matchMode !== "exact" &&
      available.some((plugin) => plugin.name() === "磁力索引") &&
      !staticAliases.some((alias) => /^[\x00-\x7F]+$/.test(alias));
    const remoteAliases = needsMovieAlias
      ? await resolveMovieSearchAliases(
          keyword,
          ext.__resource_database,
          signal
        ).catch(() => [])
      : [];
    const sharedAliases = [...staticAliases, ...remoteAliases].filter(
      (value, index, values) =>
        values.findIndex(
          (candidate) =>
            candidate.trim().toLowerCase() === value.trim().toLowerCase()
        ) === index
    );

    const requestedTimeout = Number((ext as any)?.__plugin_timeout_ms) || 0;
    const timeoutMs = Math.max(
      3000,
      requestedTimeout > 0
        ? requestedTimeout
        : this.options.pluginTimeoutMs || 0
    );

    const pluginPromises = available.map((plugin) => async () => {
      plugin.setMainCacheKey(cacheKey);
      plugin.setCurrentKeyword(keyword);

      const startTime = Date.now();
      const pluginName = plugin.name();
      const sourcePolicy = policyFor(pluginName);
      // A plugin may declare a tighter source-specific budget. This keeps slow
      // supplemental sources from delaying faster catalog results, while the
      // global setting remains the fallback for plugins without an override.
      const declaredTimeoutMs = plugin.timeoutMs?.() || timeoutMs;
      const pluginBudgetMs = Math.max(
        1,
        Math.min(
          timeoutMs,
          declaredTimeoutMs,
          sourcePolicy?.timeoutMs || Number.POSITIVE_INFINITY
        )
      );

      try {
        const aliases = sharedAliases.slice(0, 2);
        const latinAlias = aliases.find((alias) =>
          /^[\x00-\x7F]+$/.test(alias)
        );
        const curatedAliasQueries =
          plugin.useKeywordVariants?.() === false &&
          /[\u3400-\u9fff]/u.test(keyword) &&
          latinAlias
            ? [
                latinAlias,
                keyword,
                ...aliases.filter((alias) => alias !== latinAlias),
              ]
            : [keyword, ...aliases];
        const queries = matchMode === "exact"
          ? [keyword]
          : plugin.useKeywordVariants?.() === false
            ? curatedAliasQueries.slice(
                0,
                SearchService.MAX_PLUGIN_QUERY_VARIANTS
              )
            : (keyword || "").trim().length <= 1
              ? [keyword, "电影", "movie"]
              : [
                  keyword,
                  ...aliases,
                  ...buildSearchKeywordVariants(keyword).slice(1),
                ].filter(
                  (value, index, values) =>
                    values.findIndex(
                      (candidate) =>
                        candidate.trim().toLowerCase() === value.trim().toLowerCase()
                    ) === index
                ).slice(
                  0,
                  Math.min(
                    SearchService.MAX_PLUGIN_QUERY_VARIANTS,
                    Math.max(1, sourcePolicy?.maxVariants || 3)
                  )
                );

        let results: SearchResult[] = [];
        let rawResultCount = 0;
        let duplicateCount = 0;
        let timedOut = false;
        let queryCount = 0;
        let cachedQueryCount = 0;
        for (const [index, query] of queries.entries()) {
          // 客户端断开时跳过剩余查询
          if (signal?.aborted) break;
          const remainingBudgetMs = pluginBudgetMs - (Date.now() - startTime);
          if (remainingBudgetMs <= 0) {
            timedOut = true;
            break;
          }

          // 为每次插件请求创建独立的 AbortController，
          // 超时后 withTimeout 会 abort，使底层请求有机会被真正取消（而非泄漏）
          const controller = new AbortController();
          // 将外部取消和超时合并：任一触发都会 abort
          const mergedSignal = signal
            ? AbortSignal.any([signal, controller.signal])
            : controller.signal;
          let queryTimedOut = false;
          const executionExt = {
            ...ext,
            __plugin_timeout_ms: remainingBudgetMs,
            __source_cache_status: "miss",
            signal: mergedSignal,
          };
          const currentResults = await this.withTimeout<SearchResult[]>(
            plugin.search(query, executionExt),
            remainingBudgetMs,
            [],
            controller,
            () => {
              queryTimedOut = true;
            }
          );
          queryCount += 1;
          if (executionExt.__source_cache_status === "hit") {
            cachedQueryCount += 1;
          }

          const relevantResults = plugin.skipServiceFilter()
            ? currentResults || []
            : (currentResults || []).filter((result) => {
                const hasMagnet = (result.links || []).some(
                  (link) =>
                    link.type?.toLowerCase() === "magnet" ||
                    /^magnet:\?/i.test(link.url)
                );
                return !hasMagnet || isStrictTitleMatch(result.title, query);
              });
          const sourceName = this.pluginSourceName(pluginName);
          const sourcedResults = relevantResults.map((result) => ({
            ...result,
            source: result.source || sourceName,
          }));
          rawResultCount += sourcedResults.length;
          const beforeMergeCount = results.length;
          results = this.mergeUniqueResults(results, sourcedResults);
          duplicateCount += Math.max(
            0,
            beforeMergeCount + sourcedResults.length - results.length
          );
          if (queryTimedOut) {
            timedOut = true;
            break;
          }

          if (
            results.length >= SearchService.PLUGIN_VARIANT_TRIGGER ||
            index === queries.length - 1
          ) {
            break;
          }
        }

        const responseTime = Date.now() - startTime;
        const fullyCached =
          queryCount > 0 && cachedQueryCount === queryCount;
        const success = !timedOut || results.length > 0;
        if (!fullyCached) {
          if (success) this.healthChecker.recordSuccess(pluginName, responseTime);
          else this.healthChecker.recordFailure(pluginName);
        }
        sourceMetrics.push({
          sourceKey: pluginName,
          resultCount: rawResultCount,
          uniqueResultCount: results.length,
          duplicateCount,
          latencyMs: responseTime,
          success,
          timedOut,
          cached: fullyCached,
        });

        return results;
      } catch (error) {
        const errorMs = Date.now() - startTime;
        this.healthChecker.recordFailure(pluginName);
        sourceMetrics.push({
          sourceKey: pluginName,
          resultCount: 0,
          uniqueResultCount: 0,
          duplicateCount: 0,
          latencyMs: errorMs,
          success: false,
          timedOut: false,
          cached: false,
        });

        loggers.search.debug("单插件失败", {
          plugin: pluginName,
          ms: errorMs,
          error: error instanceof Error ? error.message : String(error),
          keyword,
        });

        throw error;
      }
    });

    const resultsByPlugin = await this.runWithConcurrency(
      pluginPromises.map((promiseFactory) => async () => {
        try {
          return await promiseFactory();
        } catch (error) {
          const errorDetail = classifyError(error, "plugin_search");
          errorCollector.record(errorDetail);
          return [];
        }
      }),
      concurrency,
      signal
    );

    const merged: SearchResult[] = [];
    for (const arr of resultsByPlugin) {
      if (Array.isArray(arr)) {
        merged.push(...arr);
      }
    }

    if (cacheEnabled && merged.length > 0) {
      this.cache.set(CacheNamespace.PLUGIN_SEARCH, cacheKey, merged);
    }

    return merged;
  }

  private withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    fallback: T,
    controller?: AbortController,
    onTimeout?: () => void
  ): Promise<T> {
    if (!ms || ms <= 0) return promise;
    let timeoutHandle: any;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutHandle = setTimeout(() => {
        onTimeout?.();
        // 超时后取消底层请求，避免 socket/内存泄漏
        if (controller && !controller.signal.aborted) {
          controller.abort();
        }
        resolve(fallback);
      }, ms);
    });
    return Promise.race([
      promise.finally(() => clearTimeout(timeoutHandle)),
      timeoutPromise,
    ]) as Promise<T>;
  }

  private mergeSearchResults(
    a: SearchResult[],
    b: SearchResult[]
  ): SearchResult[] {
    return this.mergeUniqueResults(a, b);
  }

  private mergeUniqueResults(
    a: SearchResult[],
    b: SearchResult[]
  ): SearchResult[] {
    const indexByKey = new Map<string, number>();
    const out: SearchResult[] = [];
    const pushUnique = (result: SearchResult) => {
      const firstLink = Array.isArray(result.links) ? result.links[0]?.url : "";
      const firstMagnet = (result.links || []).find(
        (link) => link.type?.toLowerCase() === "magnet" || /^magnet:\?/i.test(link.url)
      );
      const key =
        (firstMagnet ? normalizeMagnetKey(firstMagnet.url) : "") ||
        result.unique_id ||
        result.message_id ||
        firstLink ||
        `${result.title}|${result.channel}|${result.datetime || ""}`;
      const existingIndex = indexByKey.get(key);
      if (existingIndex !== undefined) {
        if (!firstMagnet) return;
        const existing = out[existingIndex];
        const existingMagnet = existing?.links.find(
          (link) => link.type?.toLowerCase() === "magnet" || /^magnet:\?/i.test(link.url)
        );
        if (!existing || !existingMagnet) return;
        const existingTime = Date.parse(existing.datetime || "");
        const incomingTime = Date.parse(result.datetime || "");
        const chosenMagnet =
          firstMagnet.url.length > existingMagnet.url.length
            ? firstMagnet
            : existingMagnet;
        const otherLinks = new Map<string, (typeof result.links)[number]>();
        for (const link of [...existing.links, ...result.links]) {
          if (link === existingMagnet || link === firstMagnet) continue;
          otherLinks.set(`${link.type.toLowerCase()}:${link.url.trim()}`, link);
        }
        out[existingIndex] = {
          ...existing,
          title:
            result.title.length > existing.title.length
              ? result.title
              : existing.title,
          content:
            result.content.length > existing.content.length
              ? result.content
              : existing.content,
          datetime:
            Number.isFinite(incomingTime) &&
            (!Number.isFinite(existingTime) || incomingTime > existingTime)
              ? result.datetime
              : existing.datetime,
          links: [chosenMagnet, ...otherLinks.values()],
          metadata: mergeTorrentMetadata(existing.metadata, result.metadata),
        };
        return;
      }
      indexByKey.set(key, out.length);
      out.push(result);
    };

    for (const result of a) pushUnique(result);
    for (const result of b) pushUnique(result);
    return out;
  }

  private sortResultsByTimeDesc(arr: SearchResult[]) {
    // 缺失/非法 datetime 不能直接 new Date(...).getTime()（会得 NaN），
    // 否则比较器返回 NaN 让排序结果未定义。统一视为 0（最旧），排到末尾。
    const toTime = (value?: string): number => {
      if (!value) return 0;
      const t = Date.parse(value);
      return Number.isFinite(t) ? t : 0;
    };
    arr.sort((x, y) => toTime(y.datetime) - toTime(x.datetime));
  }

  private matchesExactResult(result: SearchResult, keyword: string): boolean {
    const searchableFields = [
      result.title,
      result.content,
      ...(result.tags || []),
    ];

    return searchableFields.some((value) =>
      matchesExactSearchKeyword(value || "", keyword)
    );
  }

  private pluginSourceName(name: string): string {
    const sources: Record<string, string> = {
      nyaa: "Nyaa",
      solidtorrents: "BitSearch",
      pansearch: "PanSearch",
      "好搜聚合": "好搜聚合",
      "精选资料库": "精选资料库",
      "影视速搜": "影视速搜",
      "影视直达": "影视直达",
      "资源补充": "资源补充",
      "磁力索引": "磁力索引",
      "全网索引": "全网索引",
      "网络资源索引": "网络资源索引",
    };
    return sources[name.toLowerCase()] || name;
  }

  private mergeResultsByType(
    results: SearchResult[],
    keyword: string,
    cloudTypes?: string[]
  ): MergedLinks {
    const allow =
      cloudTypes && cloudTypes.length > 0
        ? new Set(cloudTypes.map((value) => value.toLowerCase()))
        : undefined;
    const out: MergedLinks = {};
    const indexesByType = new Map<string, Map<string, number>>();
    for (const result of results) {
      for (const link of result.links || []) {
        const type = (link.type || "").toLowerCase();
        const url = (link.url || "").trim();
        if (!type || !url) continue;
        if (allow && !allow.has(type)) continue;
        if (!out[type]) out[type] = [];
        if (!indexesByType.has(type)) indexesByType.set(type, new Map());
        const normalizedUrl = type === "magnet"
          ? normalizeMagnetKey(url)
          : url.replace(/\/$/, "").toLowerCase();
        const source = result.source
          || (result.channel ? "频道索引" : undefined);
        const metadata = type === "magnet"
          ? mergeTorrentMetadata(
              enrichTorrentMetadata(result.title, result.content, result.metadata),
              source ? { sources: [source] } : undefined
            )
          : result.metadata;
        const incoming = {
          url,
          password: link.password,
          note: result.title,
          datetime: result.datetime,
          source,
          images: result.images,
          metadata,
          category:
            result.metadata?.category ||
            result.tags?.[0] ||
            (result.content && result.content.length <= 60
              ? result.content
              : undefined),
          sources: source ? [source] : [],
          support_count: 1,
        };
        const existingIndex = indexesByType.get(type)!.get(normalizedUrl);
        if (existingIndex === undefined) {
          indexesByType.get(type)!.set(normalizedUrl, out[type].length);
          out[type].push(incoming);
          continue;
        }

        const existing = out[type][existingIndex];
        if (!existing) continue;
        const existingScore = scoreTorrentResult(existing, keyword);
        const incomingScore = scoreTorrentResult(incoming, keyword);
        const preferIncomingTitle = incomingScore > existingScore;
        const existingTime = Date.parse(existing.datetime || "");
        const incomingTime = Date.parse(incoming.datetime || "");
        out[type][existingIndex] = {
          ...existing,
          url: incoming.url.length > existing.url.length ? incoming.url : existing.url,
          note: preferIncomingTitle ? incoming.note : existing.note,
          datetime:
            Number.isFinite(incomingTime) && (!Number.isFinite(existingTime) || incomingTime > existingTime)
              ? incoming.datetime
              : existing.datetime,
          source: existing.source || incoming.source,
          images: existing.images?.length ? existing.images : incoming.images,
          metadata: mergeTorrentMetadata(existing.metadata, incoming.metadata),
          category: existing.category || incoming.category,
          sources: Array.from(
            new Set([
              ...(existing.sources || (existing.source ? [existing.source] : [])),
              ...(incoming.sources || (incoming.source ? [incoming.source] : [])),
            ])
          ),
          support_count: Array.from(
            new Set([
              ...(existing.sources || (existing.source ? [existing.source] : [])),
              ...(incoming.sources || (incoming.source ? [incoming.source] : [])),
            ])
          ).length || 1,
        };
      }
    }

    for (const [type, items] of Object.entries(out)) {
      sortMergedLinksByRelevance(items, keyword, type);
    }
    return out;
  }

  private async runWithConcurrency<T>(
    tasks: Array<() => Promise<T>>,
    limit: number,
    signal?: AbortSignal
  ): Promise<T[]> {
    const limitFn = pLimit(limit);
    const limitedTasks = tasks.map((task) => limitFn(task));
    const results = await Promise.all(limitedTasks);
    // 客户端断开后，后续调用方应检查 signal，这里返回已有结果
    return results;
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  clearCache(namespace?: CacheNamespace) {
    if (namespace) {
      this.cache.clearNamespace(namespace);
    } else {
      this.cache.clearAll();
    }
  }

  getPluginHealthStatus() {
    return this.healthChecker.getAllStatus();
  }

  resetPluginHealth(pluginName?: string) {
    if (pluginName) {
      this.healthChecker.reset(pluginName);
    } else {
      this.healthChecker.resetAll();
    }
  }
}
