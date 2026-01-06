import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry } from '../registry';
import { BaseAsyncPlugin } from '../manager';
import type { SearchResult } from '../../types/models';

// 测试插件类
class TestPlugin extends BaseAsyncPlugin {
  constructor(name: string, priority: number) {
    super(name, priority);
  }

  async search(keyword: string): Promise<SearchResult[]> {
    return [
      {
        message_id: 'test',
        unique_id: `${this.name()}-${keyword}`,
        channel: 'test-channel',
        datetime: new Date().toISOString(),
        title: `Test result from ${this.name()}`,
        content: `Content for ${keyword}`,
        links: [{ url: 'https://example.com', type: 'baidu', password: '' }],
      },
    ];
  }
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('注册功能', () => {
    it('应该正确注册单个插件工厂', () => {
      registry.register('test-plugin', () => new TestPlugin('test-plugin', 1));

      expect(registry.has('test-plugin')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('应该正确批量注册插件', () => {
      registry.registerMany({
        'plugin1': () => new TestPlugin('plugin1', 1),
        'plugin2': () => new TestPlugin('plugin2', 2),
        'plugin3': () => new TestPlugin('plugin3', 3),
      });

      expect(registry.size).toBe(3);
      expect(registry.has('plugin1')).toBe(true);
      expect(registry.has('plugin2')).toBe(true);
      expect(registry.has('plugin3')).toBe(true);
    });

    it('应该返回所有已注册的插件名称', () => {
      registry.registerMany({
        'alpha': () => new TestPlugin('alpha', 1),
        'beta': () => new TestPlugin('beta', 2),
        'gamma': () => new TestPlugin('gamma', 3),
      });

      const names = registry.getNames();
      expect(names).toHaveLength(3);
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
      expect(names).toContain('gamma');
    });
  });

  describe('创建实例', () => {
    it('应该正确创建单个插件实例', () => {
      registry.register('test', () => new TestPlugin('test', 1));
      const instance = registry.create('test');

      expect(instance).toBeInstanceOf(TestPlugin);
      expect(instance?.name()).toBe('test');
      expect(instance?.priority()).toBe(1);
    });

    it('应该返回 null 当插件不存在', () => {
      const instance = registry.create('nonexistent');
      expect(instance).toBeNull();
    });

    it('应该创建所有插件实例', () => {
      registry.registerMany({
        'p1': () => new TestPlugin('p1', 1),
        'p2': () => new TestPlugin('p2', 2),
        'p3': () => new TestPlugin('p3', 3),
      });

      const instances = registry.createAll();
      expect(instances).toHaveLength(3);
      expect(instances[0].name()).toBe('p1');
      expect(instances[1].name()).toBe('p2');
      expect(instances[2].name()).toBe('p3');
    });

    it('应该创建指定名称的插件实例', () => {
      registry.registerMany({
        'alpha': () => new TestPlugin('alpha', 1),
        'beta': () => new TestPlugin('beta', 2),
        'gamma': () => new TestPlugin('gamma', 3),
      });

      const instances = registry.createMany(['alpha', 'gamma']);
      expect(instances).toHaveLength(2);
      expect(instances[0].name()).toBe('alpha');
      expect(instances[1].name()).toBe('gamma');
    });

    it('应该跳过不存在的插件名称', () => {
      registry.register('exists', () => new TestPlugin('exists', 1));

      const instances = registry.createMany(['exists', 'nonexistent', 'also-missing']);
      expect(instances).toHaveLength(1);
      expect(instances[0].name()).toBe('exists');
    });
  });

  describe('其他功能', () => {
    it('应该正确清空注册表', () => {
      registry.registerMany({
        'p1': () => new TestPlugin('p1', 1),
        'p2': () => new TestPlugin('p2', 2),
      });

      expect(registry.size).toBe(2);

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.has('p1')).toBe(false);
      expect(registry.create('p1')).toBeNull();
    });

    it('应该处理插件工厂返回 null', () => {
      registry.register('null-plugin', () => null as any);

      const instance = registry.create('null-plugin');
      expect(instance).toBeNull();
    });

    it('应该支持动态配置的插件加载', () => {
      // 模拟配置驱动的插件注册
      const enabledPlugins = ['plugin1', 'plugin3'];

      registry.registerMany({
        'plugin1': () => new TestPlugin('plugin1', 1),
        'plugin2': () => new TestPlugin('plugin2', 2),
        'plugin3': () => new TestPlugin('plugin3', 3),
      });

      const instances = registry.createMany(enabledPlugins);
      expect(instances).toHaveLength(2);
      expect(instances.map(p => p.name())).toEqual(['plugin1', 'plugin3']);
    });
  });
});
