import pLimit from "p-limit";
import { MemoryCache } from "../cache/memoryCache";
import { safeExecute, fetchWithRetry } from "../utils/fetch";
import type {
  MergedLinks,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from "../types/models";
import { PluginManager, type AsyncSearchPlugin } from "../plugins/manager";
import { metrics } from "../monitoring/metrics";

export interface SearchServiceOptions {
  priorityChannels: string[];
  defaultChannels: string[];
  defaultConcurrency: number;
  pluginTimeoutMs: number;
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
}

export class SearchService {
  private options: SearchServiceOptions;
  private pluginManager: PluginManager;
  private tgCache = new MemoryCache<SearchResult[]>();
  private pluginCache = new MemoryCache<SearchResult[]>();

  constructor(options: SearchServiceOptions, pluginManager: PluginManager) {
    this.options = options;
    this.pluginManager = pluginManager;
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
    ext: Record<string, any> | undefined
  ): Promise<SearchResponse> {
    // 日志已精简：只在搜索完成时打印结果，避免重复打印用户搜索词

    const effChannels =
      channels && channels.length > 0 ? channels : this.options.defaultChannels;
    const effConcurrency =
      concurrency && concurrency > 0
        ? concurrency
        : this.options.defaultConcurrency;
    const effResultType =
      !resultType || resultType === "merge" ? "merged_by_type" : resultType;
    const effSourceType = sourceType ?? "all";

    let tgResults: SearchResult[] = [];
    let pluginResults: SearchResult[] = [];

    const tasks: Array<() => Promise<void>> = [];

    if (effSourceType === "all" || effSourceType === "tg") {
      tasks.push(async () => {
        const concOverride =
          typeof concurrency === "number" && concurrency > 0
            ? concurrency
            : undefined;
        tgResults = await this.searchTG(
          keyword,
          effChannels,
          !!forceRefresh,
          concOverride,
          ext
        );
      });
    }
    if (effSourceType === "all" || effSourceType === "plugin") {
      tasks.push(async () => {
        pluginResults = await this.searchPlugins(
          keyword,
          plugins,
          !!forceRefresh,
          effConcurrency,
          ext ?? {}
        );
      });
    }

    await Promise.all(tasks.map((t) => t()));

    const allResults = this.mergeSearchResults(tgResults, pluginResults);
    this.sortResultsByTimeDesc(allResults);

    const filteredForResults: SearchResult[] = [];
    for (const r of allResults) {
      const hasTime = !!r.datetime;
      const hasLinks = Array.isArray(r.links) && r.links.length > 0;
      const keywordPriority = this.getKeywordPriority(r.title);
      const pluginLevel = this.getPluginLevelBySource(this.getResultSource(r));
      if (hasTime || hasLinks || keywordPriority > 0 || pluginLevel <= 2)
        filteredForResults.push(r);
    }

    const mergedLinks = this.mergeResultsByType(
      allResults,
      keyword,
      cloudTypes
    );

    let total = 0;
    let response: SearchResponse = { total: 0 };
    if (effResultType === "merged_by_type") {
      total = Object.values(mergedLinks).reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      response = { total, merged_by_type: mergedLinks };
    } else if (effResultType === "results") {
      total = filteredForResults.length;
      response = { total, results: filteredForResults };
    } else {
      // all
      total = filteredForResults.length;
      response = {
        total,
        results: filteredForResults,
        merged_by_type: mergedLinks,
      };
    }

    return response;
  }

  private async searchTG(
    keyword: string,
    channels: string[] | undefined,
    forceRefresh: boolean,
    concurrencyOverride?: number,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    const chList = Array.isArray(channels) ? channels : [];
    const cacheKey = `tg:${keyword}:${[...chList].sort().join(",")}`;
    const { cacheEnabled, cacheTtlMinutes, priorityChannels } = this.options;

    // 缓存检查
    if (!forceRefresh && cacheEnabled) {
      const cached = this.tgCache.get(cacheKey);
      if (cached.hit && cached.value) {
        return cached.value;
      }
    }

    // 获取配置
    const { fetchTgChannelPosts } = await import("./tg");
    const perChannelLimit = 30;
    const requestedTimeout = Number((ext as any)?.__plugin_timeout_ms) || 0;
    const timeoutMs = Math.max(
      3000,
      requestedTimeout > 0
        ? requestedTimeout
        : this.options.pluginTimeoutMs || 0
    );
    const concurrency = Math.max(
      2,
      Math.min(concurrencyOverride ?? this.options.defaultConcurrency, 12)
    );

    // 分批策略：优先频道 + 普通频道
    const prioritySet = new Set(priorityChannels || []);
    const priorityList = chList.filter((ch) => prioritySet.has(ch));
    const normalList = chList.filter((ch) => !prioritySet.has(ch));

    // 辅助函数：创建频道搜索任务
    const createChannelTask = (channel: string) => async () => {
      const result = await safeExecute(
        () =>
          this.withTimeout<SearchResult[]>(
            fetchTgChannelPosts(channel, keyword, {
              limitPerChannel: perChannelLimit,
            }),
            timeoutMs,
            []
          ),
        []
      );
      return result;
    };

    // 第一批：优先频道（使用更高并发）
    let results: SearchResult[] = [];
    if (priorityList.length > 0) {
      const priorityConcurrency = Math.min(concurrency * 2, 12); // 优先频道使用双倍并发
      const priorityTasks = priorityList.map(createChannelTask);
      const priorityResults = await this.runWithConcurrency(
        priorityTasks,
        priorityConcurrency
      );

      for (const arr of priorityResults) {
        if (Array.isArray(arr)) {
          results.push(...arr);
        }
      }
    }

    // 如果优先频道已有结果，继续抓取普通频道
    if (normalList.length > 0) {
      const normalTasks = normalList.map(createChannelTask);
      const normalResults = await this.runWithConcurrency(
        normalTasks,
        concurrency
      );

      for (const arr of normalResults) {
        if (Array.isArray(arr)) {
          results.push(...arr);
        }
      }
    }

    // 缓存结果
    if (cacheEnabled && results.length > 0) {
      this.tgCache.set(cacheKey, results, cacheTtlMinutes * 60_000);
    }

    return results;
  }

  private async searchPlugins(
    keyword: string,
    plugins: string[] | undefined,
    forceRefresh: boolean,
    concurrency: number,
    ext: Record<string, any>
  ): Promise<SearchResult[]> {
    const cacheKey = `plugin:${keyword}:${(plugins ?? [])
      .map((p) => p?.toLowerCase())
      .filter(Boolean)
      .sort()
      .join(",")}`;
    const { cacheEnabled, cacheTtlMinutes } = this.options;

    if (!forceRefresh && cacheEnabled) {
      const cached = this.pluginCache.get(cacheKey);
      if (cached.hit && cached.value) {
        return cached.value;
      }
    }

    const allPlugins = this.pluginManager.getPlugins();
    let available: AsyncSearchPlugin[] = [];
    if (plugins && plugins.length > 0 && plugins.some((p) => !!p)) {
      const wanted = new Set(plugins.map((p) => p.toLowerCase()));
      available = allPlugins.filter((p) => wanted.has(p.name().toLowerCase()));
    } else {
      available = allPlugins;
    }

    const requestedTimeout = Number((ext as any)?.__plugin_timeout_ms) || 0;
    const timeoutMs = Math.max(
      3000,
      requestedTimeout > 0
        ? requestedTimeout
        : this.options.pluginTimeoutMs || 0
    );

    // 使用 safeExecuteAll 统一处理错误，避免单个插件失败影响整体
    const pluginPromises = available.map((p) => async () => {
      p.setMainCacheKey(cacheKey);
      p.setCurrentKeyword(keyword);

      // 主搜索
      let results = await this.withTimeout<SearchResult[]>(
        p.search(keyword, ext),
        timeoutMs,
        []
      );

      // 短关键词兜底逻辑
      if (
        (!results || results.length === 0) &&
        (keyword || "").trim().length <= 1
      ) {
        const fallbacks = ["电影", "movie", "1080p"];
        for (const fb of fallbacks) {
          const fallbackResults = await this.withTimeout<SearchResult[]>(
            p.search(fb, ext),
            timeoutMs,
            []
          );
          if (fallbackResults && fallbackResults.length > 0) {
            results = fallbackResults;
            break;
          }
        }
      }

      return results || [];
    });

    // 使用并发控制执行，同时利用 safeExecuteAll 提供统一错误处理
    const resultsByPlugin = await this.runWithConcurrency(
      pluginPromises.map((promiseFactory) => async () => {
        return await safeExecute(
          promiseFactory,
          []
        );
      }),
      concurrency
    );

    const merged: SearchResult[] = [];
    for (const arr of resultsByPlugin) {
      if (Array.isArray(arr)) {
        merged.push(...arr);
      }
    }

    if (cacheEnabled && merged.length > 0) {
      this.pluginCache.set(cacheKey, merged, cacheTtlMinutes * 60_000);
    }

    return merged;
  }

  private withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    fallback: T
  ): Promise<T> {
    if (!ms || ms <= 0) return promise;
    let timeoutHandle: any;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutHandle = setTimeout(() => resolve(fallback), ms);
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
    const seen = new Set<string>();
    const out: SearchResult[] = [];
    const pushUnique = (r: SearchResult) => {
      const key = r.unique_id || r.message_id || `${r.title}|${r.channel}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(r);
    };
    for (const r of a) pushUnique(r);
    for (const r of b) pushUnique(r);
    return out;
  }

  private sortResultsByTimeDesc(arr: SearchResult[]) {
    arr.sort(
      (x, y) => new Date(y.datetime).getTime() - new Date(x.datetime).getTime()
    );
  }

  private getResultSource(_r: SearchResult): string {
    // 可根据 SearchResult 增补来源字段，这里返回空表示未知
    return "";
  }

  private getPluginLevelBySource(_source: string): number {
    return 3;
  }
  private getKeywordPriority(_title: string): number {
    return 0;
  }

  private mergeResultsByType(
    results: SearchResult[],
    _keyword: string,
    cloudTypes?: string[]
  ): MergedLinks {
    const allow =
      cloudTypes && cloudTypes.length > 0
        ? new Set(cloudTypes.map((s) => s.toLowerCase()))
        : undefined;
    const out: MergedLinks = {};
    for (const r of results) {
      for (const link of r.links || []) {
        const t = (link.type || "").toLowerCase();
        if (allow && !allow.has(t)) continue;
        if (!out[t]) out[t] = [];
        out[t].push({
          url: link.url,
          password: link.password,
          note: r.title,
          datetime: r.datetime,
          images: r.images,
        });
      }
    }
    return out;
  }

  private async runWithConcurrency<T>(
    tasks: Array<() => Promise<T>>,
    limit: number
  ): Promise<T[]> {
    const limitFn = pLimit(limit);
    const limitedTasks = tasks.map((task) => limitFn(task));
    return Promise.all(limitedTasks);
  }
}
