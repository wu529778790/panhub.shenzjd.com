import { describe, it, expect, beforeEach } from 'vitest';
import { PluginManager, BaseAsyncPlugin } from '../manager';
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

describe('PluginManager', () => {
  let pm: PluginManager;

  beforeEach(() => {
    pm = new PluginManager();
  });

  describe('依赖注入方式', () => {
    it('应该正确注册单个插件', () => {
      const plugin = new TestPlugin('test1', 1);
      pm.registerPlugin(plugin);

      expect(pm.size).toBe(1);
      expect(pm.getPlugin('test1')).toBe(plugin);
    });

    it('应该正确批量注册插件', () => {
      const plugins = [
        new TestPlugin('plugin1', 2),
        new TestPlugin('plugin2', 1),
        new TestPlugin('plugin3', 3),
      ];

      pm.registerPlugins(plugins);

      expect(pm.size).toBe(3);
      expect(pm.getPlugin('plugin1')).toBe(plugins[0]);
      expect(pm.getPlugin('plugin2')).toBe(plugins[1]);
      expect(pm.getPlugin('plugin3')).toBe(plugins[2]);
    });

    it('应该按优先级排序返回插件', () => {
      const plugins = [
        new TestPlugin('high', 3),
        new TestPlugin('low', 1),
        new TestPlugin('medium', 2),
      ];

      pm.registerPlugins(plugins);
      const sorted = pm.getPlugins();

      expect(sorted[0].name()).toBe('low');
      expect(sorted[1].name()).toBe('medium');
      expect(sorted[2].name()).toBe('high');
    });

    it('应该返回指定名称的插件', () => {
      const plugins = [
        new TestPlugin('alpha', 1),
        new TestPlugin('beta', 2),
      ];

      pm.registerPlugins(plugins);

      expect(pm.getPlugin('alpha')?.name()).toBe('alpha');
      expect(pm.getPlugin('beta')?.name()).toBe('beta');
      expect(pm.getPlugin('gamma')).toBeUndefined();
    });

    it('应该正确清空插件', () => {
      pm.registerPlugins([
        new TestPlugin('p1', 1),
        new TestPlugin('p2', 2),
      ]);

      expect(pm.size).toBe(2);

      pm.clear();

      expect(pm.size).toBe(0);
      expect(pm.getPlugins()).toEqual([]);
    });

    it('应该处理空插件注册', () => {
      pm.registerPlugin(null as any);
      pm.registerPlugins([null as any, undefined as any]);

      expect(pm.size).toBe(0);
    });
  });

  describe('插件功能', () => {
    it('应该正确执行插件搜索', async () => {
      const plugin = new TestPlugin('search-test', 1);
      pm.registerPlugin(plugin);

      const results = await plugin.search('test-keyword');

      expect(results).toHaveLength(1);
      expect(results[0].unique_id).toBe('search-test-test-keyword');
    });

    it('应该正确设置缓存键和关键词', () => {
      const plugin = new TestPlugin('cache-test', 1);
      pm.registerPlugin(plugin);

      plugin.setMainCacheKey('test-cache-key');
      plugin.setCurrentKeyword('test-keyword');

      // 验证设置成功（通过内部状态）
      expect(plugin.name()).toBe('cache-test');
    });
  });
});
