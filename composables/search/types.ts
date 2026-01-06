import type { MergedLinks, SearchResponse } from "~/server/core/types/models";

/**
 * 搜索选项
 */
export interface SearchOptions {
  apiBase: string;
  keyword: string;
  settings: {
    enabledPlugins: string[];
    enabledTgChannels: string[];
    concurrency: number;
    pluginTimeoutMs: number;
  };
}

/**
 * 搜索状态
 */
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

/**
 * 搜索上下文（在函数间共享的状态）
 */
export interface SearchContext {
  state: Ref<SearchState>;
  searchSeq: { value: number };
  activeControllers: AbortController[];
}
