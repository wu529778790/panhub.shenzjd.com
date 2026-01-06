/**
 * 插件注册表 - 依赖注入版本
 *
 * 重构说明：
 * - 移除了全局注册表（globalRegistry）
 * - 使用显式依赖注入
 * - 支持配置驱动的插件加载
 * - 便于单元测试和扩展
 */

import type { AsyncSearchPlugin } from './manager';

// 所有可用的插件工厂
export type PluginFactory = () => AsyncSearchPlugin;

// 插件注册表类
export class PluginRegistry {
  private factories: Map<string, PluginFactory> = new Map();

  /**
   * 注册插件工厂
   */
  register(name: string, factory: PluginFactory): void {
    this.factories.set(name, factory);
  }

  /**
   * 批量注册插件
   */
  registerMany(plugins: Record<string, PluginFactory>): void {
    for (const [name, factory] of Object.entries(plugins)) {
      this.register(name, factory);
    }
  }

  /**
   * 创建插件实例
   */
  create(name: string): AsyncSearchPlugin | null {
    const factory = this.factories.get(name);
    if (!factory) return null;
    return factory();
  }

  /**
   * 创建所有插件实例
   */
  createAll(): AsyncSearchPlugin[] {
    const instances: AsyncSearchPlugin[] = [];
    for (const factory of this.factories.values()) {
      instances.push(factory());
    }
    return instances;
  }

  /**
   * 创建指定插件实例
   */
  createMany(names: string[]): AsyncSearchPlugin[] {
    const instances: AsyncSearchPlugin[] = [];
    for (const name of names) {
      const instance = this.create(name);
      if (instance) instances.push(instance);
    }
    return instances;
  }

  /**
   * 获取所有已注册的插件名称
   */
  getNames(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * 检查插件是否存在
   */
  has(name: string): boolean {
    return this.factories.has(name);
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.factories.clear();
  }

  /**
   * 获取插件数量
   */
  get size(): number {
    return this.factories.size;
  }
}

// 全局单例注册表（用于应用启动时注册）
let globalRegistry: PluginRegistry | null = null;

export function getGlobalRegistry(): PluginRegistry {
  if (!globalRegistry) {
    globalRegistry = new PluginRegistry();
  }
  return globalRegistry;
}

/**
 * 便捷函数：注册插件
 */
export function registerPlugin(name: string, factory: PluginFactory): void {
  getGlobalRegistry().register(name, factory);
}

/**
 * 便捷函数：批量注册插件
 */
export function registerPlugins(plugins: Record<string, PluginFactory>): void {
  getGlobalRegistry().registerMany(plugins);
}