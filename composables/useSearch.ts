/**
 * @deprecated 该文件已重构为模块化结构
 * 请使用 composables/search/index.ts 中的 useSearch
 *
 * 为了保持向后兼容，这里仅重新导出新的实现
 */

// 重新导出类型
export type { SearchOptions, SearchState, SearchContext } from './search/types';

// 重新导出 useSearch 函数
export { useSearch } from './search/index';
