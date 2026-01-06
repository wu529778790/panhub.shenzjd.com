import { ref, readonly } from 'vue';
import type { SearchState, SearchOptions, SearchContext } from './types';
import {
  performSearch as performSearchController,
  pauseSearch as pauseSearchController,
  continueSearch as continueSearchController,
  resetSearch as resetSearchController,
  cancelActiveRequests as cancelActiveRequestsController,
} from './controller';
import type { MergedLinks } from "~/server/core/types/models";

// 导出类型供外部使用
export type { SearchOptions, SearchState, SearchContext };

/**
 * 搜索状态管理 Composable
 *
 * 功能：
 * - 搜索状态管理（loading, error, results）
 * - 搜索流程控制（快速搜索 + 深度搜索）
 * - 暂停/继续/取消支持
 * - 结果合并与去重
 *
 * 使用示例：
 * ```ts
 * const { state, performSearch, resetSearch } = useSearch();
 *
 * await performSearch({
 *   apiBase: '/api',
 *   keyword: '测试',
 *   settings: {
 *     enabledPlugins: ['plugin1', 'plugin2'],
 *     enabledTgChannels: ['channel1'],
 *     concurrency: 5,
 *     pluginTimeoutMs: 10000,
 *   }
 * });
 * ```
 */
export function useSearch() {
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

  const searchSeq = { value: 0 };
  const activeControllers: AbortController[] = [];

  // 创建上下文
  const context = {
    state,
    searchSeq,
    activeControllers,
  };

  // 包装控制器函数，提供简洁的 API
  const performSearch = async (options: SearchOptions): Promise<void> => {
    return performSearchController(options, context);
  };

  const pauseSearch = (): void => {
    pauseSearchController(context);
  };

  const continueSearch = async (options: SearchOptions): Promise<void> => {
    return continueSearchController(options, context);
  };

  const resetSearch = (): void => {
    resetSearchController(context);
  };

  const cancelActiveRequests = (): void => {
    cancelActiveRequestsController(activeControllers);
  };

  // 工具函数
  const copyLink = async (url: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      // 忽略复制失败
    }
  };

  return {
    state: readonly(state),
    performSearch,
    resetSearch,
    copyLink,
    cancelActiveRequests,
    pauseSearch,
    continueSearch,
  };
}
