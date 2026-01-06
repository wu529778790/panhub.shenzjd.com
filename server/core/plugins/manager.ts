import type { SearchResult } from "#internal/nitro/virtual/polyfill"; // placeholder to keep type import path valid in Nitro
import type { SearchRequest } from "../types/models";

// 由于上面的导入可能会被优化器处理，这里再显式导入我们的真实类型
import type { SearchResult as RealSearchResult } from "../types/models";

/**
 * 异步搜索插件接口
 *
 * 所有插件都应该实现此接口
 */
export interface AsyncSearchPlugin {
  name(): string;
  priority(): number;
  search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<RealSearchResult[]>;
  setMainCacheKey(key: string): void;
  setCurrentKeyword(keyword: string): void;
  skipServiceFilter(): boolean;
}

/**
 * 基础插件类
 *
 * 所有插件都应该继承此类
 */
export class BaseAsyncPlugin implements AsyncSearchPlugin {
  private pluginName: string;
  private pluginPriority: number;
  protected mainCacheKey: string = "";
  protected currentKeyword: string = "";

  constructor(name: string, priority: number) {
    this.pluginName = name;
    this.pluginPriority = priority;
  }

  name(): string {
    return this.pluginName;
  }

  priority(): number {
    return this.pluginPriority;
  }

  setMainCacheKey(key: string): void {
    this.mainCacheKey = key;
  }

  setCurrentKeyword(keyword: string): void {
    this.currentKeyword = keyword;
  }

  skipServiceFilter(): boolean {
    return false;
  }

  async search(
    _keyword: string,
    _ext?: Record<string, any>
  ): Promise<RealSearchResult[]> {
    return [];
  }
}

/**
 * 插件管理器
 *
 * 重构说明：
 * - 使用依赖注入方式管理插件
 * - 支持批量注册和优先级排序
 * - 便于单元测试和配置驱动
 */
export class PluginManager {
  private plugins: AsyncSearchPlugin[] = [];

  /**
   * 注册插件实例（依赖注入方式）
   */
  registerPlugin(plugin: AsyncSearchPlugin) {
    if (!plugin) return;
    this.plugins.push(plugin);
  }

  /**
   * 批量注册插件实例
   */
  registerPlugins(plugins: AsyncSearchPlugin[]) {
    for (const plugin of plugins) {
      this.registerPlugin(plugin);
    }
  }

  /**
   * 获取所有插件（按优先级排序）
   */
  getPlugins(): AsyncSearchPlugin[] {
    // 按优先级排序（数字越小优先级越高）
    return [...this.plugins].sort((a, b) => a.priority() - b.priority());
  }

  /**
   * 获取指定名称的插件
   */
  getPlugin(name: string): AsyncSearchPlugin | undefined {
    return this.plugins.find((p) => p.name() === name);
  }

  /**
   * 获取插件数量
   */
  get size(): number {
    return this.plugins.length;
  }

  /**
   * 清空所有插件
   */
  clear(): void {
    this.plugins = [];
  }
}
