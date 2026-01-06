import { performFastSearch, performDeepSearch } from './batch';
import type { SearchOptions, SearchContext } from './types';
import { ALL_PLUGIN_NAMES } from "~/config/plugins";

/**
 * 验证搜索参数
 */
function validateSearchOptions(
  keyword: string,
  settings: SearchOptions['settings']
): string | null {
  if (!keyword || keyword.trim().length === 0) {
    return "请输入搜索关键词";
  }

  const enabledPlugins = settings.enabledPlugins.filter((n) =>
    ALL_PLUGIN_NAMES.includes(n as any)
  );

  if (
    (settings.enabledTgChannels?.length || 0) === 0 &&
    enabledPlugins.length === 0
  ) {
    return "请先在设置中选择至少一个搜索来源";
  }

  return null;
}

/**
 * iOS Safari 兼容性处理
 */
async function ensureIosCompatibility(): Promise<void> {
  if (
    typeof window !== "undefined" &&
    document.activeElement instanceof HTMLInputElement
  ) {
    document.activeElement.blur();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * 重置搜索状态
 */
function resetSearchState(state: SearchContext['state']): void {
  state.value = {
    loading: false,
    deepLoading: false,
    paused: false,
    error: "",
    searched: false,
    elapsedMs: 0,
    total: 0,
    merged: {},
  };
}

/**
 * 主搜索控制器
 */
export async function performSearch(
  options: SearchOptions,
  context: SearchContext
): Promise<void> {
  const { state, searchSeq, activeControllers } = context;
  const { keyword, settings } = options;

  // 验证
  const validationError = validateSearchOptions(keyword, settings);
  if (validationError) {
    state.value.error = validationError;
    return;
  }

  // iOS Safari 兼容性
  await ensureIosCompatibility();

  // 重置状态
  state.value.loading = true;
  state.value.error = "";
  state.value.searched = true;
  state.value.elapsedMs = 0;
  state.value.total = 0;
  state.value.merged = {};
  state.value.deepLoading = false;

  const mySeq = ++searchSeq.value;
  const start = performance.now();

  try {
    // 1) 快速搜索
    const fastMerged = await performFastSearch(options, context);
    if (searchSeq.value !== mySeq) return;

    state.value.merged = fastMerged;
    state.value.total = Object.values(fastMerged).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );

    // 2) 深度搜索
    state.value.deepLoading = true;
    await performDeepSearch(options, context);

    // 如果暂停了，停止后续操作
    if (state.value.paused) return;
  } catch (error: any) {
    state.value.error = error?.data?.message || error?.message || "请求失败";
  } finally {
    state.value.elapsedMs = Math.round(performance.now() - start);
    // 如果暂停了，保持 loading 状态，只取消 deepLoading
    if (!state.value.paused) {
      state.value.loading = false;
    }
    state.value.deepLoading = false;
  }
}

/**
 * 暂停搜索
 */
export function pauseSearch(context: SearchContext): void {
  const { state, activeControllers } = context;

  if (state.value.loading || state.value.deepLoading) {
    state.value.paused = true;
    // 取消当前的请求，但保留已获取的结果
    cancelActiveRequests(activeControllers);
  }
}

/**
 * 继续搜索（从暂停处继续）
 */
export async function continueSearch(
  options: SearchOptions,
  context: SearchContext
): Promise<void> {
  const { state } = context;

  if (!state.value.paused || !state.value.searched) return;

  state.value.paused = false;
  state.value.deepLoading = true;

  // 继续执行深度搜索
  try {
    await performDeepSearch(options, context);
  } catch (error) {
    // 忽略错误
  } finally {
    state.value.deepLoading = false;
  }
}

/**
 * 取消所有进行中的请求
 */
export function cancelActiveRequests(activeControllers: AbortController[]): void {
  for (const controller of activeControllers) {
    try {
      controller.abort();
    } catch {}
  }
  activeControllers.length = 0;
}

/**
 * 重置搜索（完整重置）
 */
export function resetSearch(
  context: SearchContext
): void {
  cancelActiveRequests(context.activeControllers);
  context.searchSeq.value++;
  resetSearchState(context.state);
}
