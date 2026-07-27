import type {
  GenericResponse,
  MergedLinks,
  SearchMatchMode,
  SearchResponse,
} from "~/types/search";
import { ALL_PLUGIN_NAMES } from "~/config/plugins";
import channelsConfig from "~/config/channels.json";
import { extractMergedFromResponse } from "~/utils/extractMergedFromResponse";
import { mergeMergedByType } from "~/utils/mergeMergedByType";
import { buildSearchTaskPlan } from "~/utils/searchTaskPlan";

const devLog = (...args: any[]) => {
  if (import.meta.dev) console.log(...args);
};
const devWarn = (...args: any[]) => {
  if (import.meta.dev) console.warn(...args);
};
const devError = (...args: any[]) => {
  if (import.meta.dev) console.error(...args);
};

export interface SearchOptions {
  apiBase: string;
  keyword: string;
  matchMode: SearchMatchMode;
  settings: {
    enabledPlugins: string[];
    enabledTgChannels: string[];
    concurrency: number;
    pluginTimeoutMs: number;
  };
}

export interface SearchState {
  loading: boolean;
  deepLoading: boolean;
  paused: boolean;
  error: string;
  searched: boolean;
  elapsedMs: number;
  total: number;
  merged: MergedLinks;
}

export function useSearch() {
  const { getAttribution } = useSeoAttribution();
  const { getContext: getTrafficContext } = useTrafficAnalytics();
  const state = ref<SearchState>({
    loading: false,
    deepLoading: false,
    paused: false,
    error: "",
    searched: false,
    elapsedMs: 0,
    total: 0,
    merged: {},
  });

  const setLoading = (v: boolean) => {
    state.value.loading = v;
  };
  const setDeepLoading = (v: boolean) => {
    state.value.deepLoading = v;
  };
  const setPaused = (v: boolean) => {
    state.value.paused = v;
  };
  const setError = (v: string) => {
    state.value.error = v;
  };
  const setSearched = (v: boolean) => {
    state.value.searched = v;
  };
  const setElapsedMs = (v: number) => {
    state.value.elapsedMs = v;
  };
  const setTotal = (v: number) => {
    state.value.total = v;
  };
  const setMerged = (v: MergedLinks) => {
    state.value.merged = v;
  };

  let searchSeq = 0;
  const activeControllers: AbortController[] = [];
  const completedTaskKeys = new Set<string>();
  let activeQualityEventId = "";
  let qualityRecorded = false;

  function createQualityEventId(prefix: string): string {
    const value = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}:${value}`;
  }

  function reportSearchCompletion(options: SearchOptions): void {
    if (!import.meta.client || !activeQualityEventId || qualityRecorded) return;
    qualityRecorded = true;
    void fetch(`${options.apiBase}/search-quality`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({
        event: "search_complete",
        eventId: activeQualityEventId,
        query: options.keyword,
        resultCount: state.value.total,
        latencyMs: state.value.elapsedMs,
        matchMode: options.matchMode,
        attribution: getAttribution(),
        traffic: getTrafficContext(),
      }),
    }).catch(() => undefined);
  }

  // 取消所有进行中的请求
  function cancelActiveRequests(): void {
    for (const controller of activeControllers) {
      try {
        controller.abort();
      } catch {}
    }
    activeControllers.length = 0;
  }

  // 暂停搜索
  function pauseSearch(): void {
    if (state.value.loading || state.value.deepLoading) {
      setPaused(true);
      cancelActiveRequests();
    }
  }

  // 继续搜索（从暂停处继续，与 performParallelSearch 同一套任务流）
  async function continueSearch(options: SearchOptions): Promise<void> {
    if (!state.value.paused || !state.value.searched) return;

    setPaused(false);
    setDeepLoading(true);

    try {
      await performParallelSearch(options, searchSeq, state.value.merged);
    } catch (error) {
      // 忽略错误
    } finally {
      setDeepLoading(false);
      setLoading(false);
      reportSearchCompletion(options);
    }
  }
  /** 创建带 AbortController 的搜索任务（插件或 TG 批次） */
  function createSearchTask(
    apiBase: string,
    keyword: string,
    matchMode: SearchMatchMode,
    conc: number,
    pluginTimeoutMs: number,
    params: { src: "plugin" | "tg"; plugins?: string; channels?: string },
    label: string,
    shouldSkip: () => boolean
  ): () => Promise<MergedLinks> {
    return async () => {
      if (shouldSkip()) {
        const error = new Error("Search task cancelled");
        error.name = "AbortError";
        throw error;
      }
      const ac = new AbortController();
      activeControllers.push(ac);
      try {
        const extParam = JSON.stringify({
          __plugin_timeout_ms: pluginTimeoutMs,
          __respect_source_quality: true,
        });
        const q = new URLSearchParams({
          kw: keyword,
          match: matchMode,
          res: "merged_by_type",
          src: params.src,
          conc: String(conc),
          ext: extParam,
        });
        if (params.plugins) q.set("plugins", params.plugins);
        if (params.channels) q.set("channels", params.channels);
        const response = await $fetch<GenericResponse<SearchResponse>>(
          `${apiBase}/search?${q.toString()}`,
          { signal: ac.signal, credentials: "include" } as any
        );
        return extractMergedFromResponse(response.data);
      } catch (error: any) {
        if (error?.name === "AbortError") throw error;
        const status =
          error?.statusCode || error?.status || error?.response?.status;
        if (status === 429) throw error;
        devWarn(`${label} search failed:`, error);
        return {};
      } finally {
        const idx = activeControllers.indexOf(ac);
        if (idx >= 0) activeControllers.splice(idx, 1);
      }
    };
  }

  interface PlannedSearchTask {
    key: string;
    run: () => Promise<MergedLinks>;
  }

  // 快速插件、优先频道并行启动；普通频道等优先频道完成后再进入深度阶段。
  // initialMerged: continueSearch 时传入暂停前已累积的结果，避免覆盖。
  async function performParallelSearch(
    options: SearchOptions,
    mySeq: number,
    initialMerged?: MergedLinks
  ): Promise<void> {
    const { apiBase, keyword, matchMode, settings } = options;
    const conc = Math.min(16, Math.max(1, Number(settings.concurrency || 6)));

    const enabledPlugins = settings.enabledPlugins.filter((n) =>
      ALL_PLUGIN_NAMES.includes(n as any)
    );

    const enabledTgChannels = settings.enabledTgChannels || [];

    if (enabledPlugins.length === 0 && enabledTgChannels.length === 0) {
      setError("请先在设置中选择至少一个搜索来源");
      return;
    }

    const shouldSkip = () => mySeq !== searchSeq || state.value.paused;
    const tgBatchSize = Math.min(16, Math.max(8, conc * 3));
    const plan = buildSearchTaskPlan(
      enabledPlugins,
      enabledTgChannels,
      channelsConfig.priorityChannels,
      tgBatchSize
    );

    const pluginTasks: PlannedSearchTask[] = plan.pluginGroups.map(
      (plugins, index) => ({
        key: `plugin:${plugins.slice().sort().join(",")}`,
        run: createSearchTask(
          apiBase,
          keyword,
          matchMode,
          conc,
          settings.pluginTimeoutMs,
          { src: "plugin", plugins: plugins.join(",") },
          index === 0 ? "Fast plugin group" : "Plugin group",
          shouldSkip
        ),
      })
    );

    const createTgTasks = (
      batches: string[][],
      phase: "priority" | "deep"
    ): PlannedSearchTask[] =>
      batches.map((batch, index) => ({
        key: `tg:${batch.slice().sort().join(",")}`,
        run: createSearchTask(
          apiBase,
          keyword,
          matchMode,
          conc,
          settings.pluginTimeoutMs,
          { src: "tg", channels: batch.join(",") },
          `TG ${phase} batch ${index + 1}`,
          shouldSkip
        ),
      }));

    const priorityTasks = createTgTasks(
      plan.priorityChannelBatches,
      "priority"
    );
    const deepTasks = createTgTasks(plan.deepChannelBatches, "deep");

    const pLimit = (await import("p-limit")).default;
    const limit = pLimit(conc);
    let currentMerged: MergedLinks = initialMerged ? { ...initialMerged } : {};
    let rateLimited = false;

    const processTask = (task: PlannedSearchTask, result: MergedLinks) => {
      if (mySeq !== searchSeq || state.value.paused) return;
      completedTaskKeys.add(task.key);
      if (Object.keys(result).length > 0) {
        currentMerged = mergeMergedByType(currentMerged, result);
        setMerged(currentMerged);
        setTotal(
          Object.values(currentMerged).reduce(
            (sum, arr) => sum + (arr?.length || 0),
            0
          )
        );
        devLog(
          "[performParallelSearch] 有数据即展示，当前总数:",
          Object.values(currentMerged).reduce((sum, items) => sum + items.length, 0)
        );
      }
    };

    const runTasks = async (tasks: PlannedSearchTask[]): Promise<void> => {
      const pending = tasks.filter(
        (task) => !completedTaskKeys.has(task.key)
      );
      await Promise.all(
        pending.map((task) =>
          limit(task.run)
            .then((result) => processTask(task, result))
            .catch((error) => {
              if (error?.name === "AbortError") return;
              const status =
                error?.statusCode || error?.status || error?.response?.status;
              if (status === 429) rateLimited = true;
              completedTaskKeys.add(task.key);
              devError("[performParallelSearch] 任务错误:", error);
            })
        )
      );
    };

    devLog("[performParallelSearch] 请求计划", {
      plugins: pluginTasks.length,
      priorityTg: priorityTasks.length,
      deepTg: deepTasks.length,
      total: plan.requestCount,
    });

    const pluginPromise = runTasks(pluginTasks);
    const telegramPromise = (async () => {
      await runTasks(priorityTasks);
      if (shouldSkip() || deepTasks.every((task) => completedTaskKeys.has(task.key))) {
        return;
      }
      setDeepLoading(true);
      await runTasks(deepTasks);
    })();

    await Promise.all([pluginPromise, telegramPromise]);
    if (Object.keys(currentMerged).length === 0 && rateLimited) {
      setError("搜索请求较多，请稍等片刻后重试");
    }
    devLog("[performParallelSearch] 所有任务完成");
  }

  // 主搜索函数
  async function performSearch(options: SearchOptions): Promise<void> {
    const { keyword, settings } = options;

    // 验证
    if (!keyword || keyword.trim().length === 0) {
      setError("请输入搜索关键词");
      return;
    }

    const enabledPlugins = settings.enabledPlugins.filter((n) =>
      ALL_PLUGIN_NAMES.includes(n as any)
    );

    if (
      (settings.enabledTgChannels?.length || 0) === 0 &&
      enabledPlugins.length === 0
    ) {
      setError("请先在设置中选择至少一个搜索来源");
      return;
    }

    // iOS Safari 兼容性：确保输入框失去焦点
    if (
      typeof window !== "undefined" &&
      document.activeElement instanceof HTMLInputElement
    ) {
      document.activeElement.blur();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 重置状态
    setLoading(true);
    setError("");
    setSearched(true);
    setElapsedMs(0);
    setTotal(0);
    setMerged({});
    setDeepLoading(false);
    activeQualityEventId = createQualityEventId("search");
    qualityRecorded = false;
    completedTaskKeys.clear();

    const mySeq = ++searchSeq;
    const start = performance.now();

    try {
      // 并行搜索 - 每个源独立请求，实时更新
      await performParallelSearch(options, mySeq);
      
      if (mySeq !== searchSeq) return;
    } catch (error: any) {
      setError(error?.data?.message || error?.message || "请求失败");
    } finally {
      setElapsedMs(Math.round(performance.now() - start));
      // 如果暂停了，保持 loading 状态，只取消 deepLoading
      if (!state.value.paused) {
        setLoading(false);
        reportSearchCompletion(options);
      }
      setDeepLoading(false);
    }
  }

  // 重置搜索
  function resetSearch(): void {
    cancelActiveRequests();
    searchSeq++;
    setLoading(false);
    setDeepLoading(false);
    setPaused(false);
    setError("");
    setSearched(false);
    setElapsedMs(0);
    setTotal(0);
    setMerged({});
    activeQualityEventId = "";
    qualityRecorded = false;
    completedTaskKeys.clear();
  }

  // 复制链接
  async function copyLink(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }

  // 响应式状态
  const loading = computed(() => state.value.loading);
  const deepLoading = computed(() => state.value.deepLoading);
  const paused = computed(() => state.value.paused);
  const error = computed(() => state.value.error);
  const searched = computed(() => state.value.searched);
  const elapsedMs = computed(() => state.value.elapsedMs);
  const total = computed(() => state.value.total);
  const merged = computed(() => state.value.merged);
  const hasResults = computed(() => Object.keys(state.value.merged).length > 0);

  return {
    state,
    loading,
    deepLoading,
    paused,
    error,
    searched,
    elapsedMs,
    total,
    merged,
    hasResults,
    performSearch,
    resetSearch,
    copyLink,
    cancelActiveRequests,
    pauseSearch,
    continueSearch,
  };
}
