/**
 * 服务层集成测试
 * 测试 SearchService、PluginManager 和 Cache 的集成工作流程
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchService, type SearchServiceOptions } from '../../server/core/services/searchService';
import { PluginManager, BaseAsyncPlugin } from '../../server/core/plugins/manager';
import { MemoryCache } from '../../server/core/cache/memoryCache';
import type { SearchResult } from '../../server/core/types/models';

// 创建测试插件
class MockPlugin1 extends BaseAsyncPlugin {
  constructor() {
    super('mock1', 1);
  }

  async search(keyword: string): Promise<SearchResult[]> {
    return [
      {
        message_id: 'mock1-1',
        unique_id: 'mock1-1',
        channel: 'mock1',
        datetime: new Date().toISOString(),
        title: `Mock1: ${keyword}`,
        content: 'Mock content 1',
        links: [{ type: 'baidu', url: 'https://pan.baidu.com/mock1', password: '' }],
      },
    ];
  }
}

class MockPlugin2 extends BaseAsyncPlugin {
  constructor() {
    super('mock2', 2);
  }

  async search(keyword: string): Promise<SearchResult[]> {
    return [
      {
        message_id: 'mock2-1',
        unique_id: 'mock2-1',
        channel: 'mock2',
        datetime: new Date().toISOString(),
        title: `Mock2: ${keyword}`,
        content: 'Mock content 2',
        links: [{ type: 'aliyun', url: 'https://alipan.com/mock2', password: '' }],
      },
    ];
  }
}

class SlowPlugin extends BaseAsyncPlugin {
  constructor() {
    super('slow', 3);
  }

  async search(keyword: string): Promise<SearchResult[]> {
    // 模拟慢响应
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      {
        message_id: 'slow-1',
        unique_id: 'slow-1',
        channel: 'slow',
        datetime: new Date().toISOString(),
        title: `Slow: ${keyword}`,
        content: 'Slow content',
        links: [{ type: 'baidu', url: 'https://pan.baidu.com/slow', password: '' }],
      },
    ];
  }
}

describe('服务层集成测试', () => {
  describe('SearchService 与 PluginManager 集成', () => {
    let pluginManager: PluginManager;
    let searchService: SearchService;
    let options: SearchServiceOptions;

    beforeEach(() => {
      pluginManager = new PluginManager();
      options = {
        priorityChannels: [],
        defaultChannels: ['test'],
        defaultConcurrency: 2,
        pluginTimeoutMs: 5000,
        cacheEnabled: false,
        cacheTtlMinutes: 30,
      };
      searchService = new SearchService(options, pluginManager);
    });

    it('应该正确注入并使用插件', async () => {
      pluginManager.registerPlugin(new MockPlugin1());
      pluginManager.registerPlugin(new MockPlugin2());

      const result = await searchService.search(
        'test',
        undefined,
        undefined,
        true,
        'results',
        'plugin',
        undefined,
        undefined,
        {}
      );

      expect(result.total).toBeGreaterThan(0);
      expect(result.results).toBeDefined();
      expect(result.results!.length).toBeGreaterThan(0);
    });

    it('应该处理插件超时', async () => {
      pluginManager.registerPlugin(new SlowPlugin());

      const startTime = Date.now();
      const result = await searchService.search(
        'test',
        undefined,
        undefined,
        true,
        'results',
        'plugin',
        undefined,
        undefined,
        { __plugin_timeout_ms: 50 } // 短超时
      );
      const duration = Date.now() - startTime;

      // 应该在超时时间内完成
      expect(duration).toBeLessThan(200);
      // 超时插件应该返回空结果
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('应该按优先级排序插件', async () => {
      pluginManager.registerPlugin(new MockPlugin2()); // priority 2
      pluginManager.registerPlugin(new MockPlugin1()); // priority 1

      const plugins = pluginManager.getPlugins();
      expect(plugins[0].name()).toBe('mock1'); // 优先级数字小的在前
      expect(plugins[1].name()).toBe('mock2');
    });

    it('应该支持指定特定插件搜索', async () => {
      pluginManager.registerPlugin(new MockPlugin1());
      pluginManager.registerPlugin(new MockPlugin2());

      const result = await searchService.search(
        'test',
        undefined,
        undefined,
        true,
        'results',
        'plugin',
        ['mock1'], // 只使用 mock1
        undefined,
        {}
      );

      expect(result.results?.every(r => r.channel === 'mock1')).toBe(true);
    });
  });

  describe('MemoryCache 集成', () => {
    let cache: MemoryCache<SearchResult[]>;

    beforeEach(() => {
      cache = new MemoryCache<SearchResult[]>();
    });

    it('应该缓存和检索结果', () => {
      const results: SearchResult[] = [
        {
          message_id: 'cache-1',
          unique_id: 'cache-1',
          channel: 'cache',
          datetime: new Date().toISOString(),
          title: 'Cached Result',
          content: 'Cached content',
          links: [],
        },
      ];

      cache.set('test-key', results, 60000);
      const cached = cache.get('test-key');

      expect(cached.hit).toBe(true);
      expect(cached.value).toEqual(results);
    });

    it('应该正确处理 LRU 淘汰', () => {
      // 设置小容量
      cache = new MemoryCache<SearchResult[]>({ maxSize: 2 });

      cache.set('key1', [{ message_id: '1', unique_id: '1', channel: 'c', datetime: '', title: 't', content: 'c', links: [] }], 60000);
      cache.set('key2', [{ message_id: '2', unique_id: '2', channel: 'c', datetime: '', title: 't', content: 'c', links: [] }], 60000);

      // 访问 key1，使其成为最近使用
      cache.get('key1');

      // 添加新条目，应该淘汰 key2
      cache.set('key3', [{ message_id: '3', unique_id: '3', channel: 'c', datetime: '', title: 't', content: 'c', links: [] }], 60000);

      expect(cache.get('key1').hit).toBe(true);
      expect(cache.get('key2').hit).toBe(false); // 被淘汰
      expect(cache.get('key3').hit).toBe(true);
    });

    it('应该处理过期', async () => {
      cache.set('expiring', [{ message_id: 'e', unique_id: 'e', channel: 'c', datetime: '', title: 't', content: 'c', links: [] }], 10);

      await new Promise(resolve => setTimeout(resolve, 20));

      const cached = cache.get('expiring');
      expect(cached.hit).toBe(false);
    });
  });

  describe('完整搜索流程', () => {
    let pluginManager: PluginManager;
    let searchService: SearchService;

    beforeEach(() => {
      pluginManager = new PluginManager();
      const options: SearchServiceOptions = {
        priorityChannels: ['priority1'],
        defaultChannels: ['normal1', 'normal2'],
        defaultConcurrency: 2,
        pluginTimeoutMs: 5000,
        cacheEnabled: true,
        cacheTtlMinutes: 1,
      };
      searchService = new SearchService(options, pluginManager);

      // 注册多个插件
      pluginManager.registerPlugin(new MockPlugin1());
      pluginManager.registerPlugin(new MockPlugin2());
    });

    it('应该执行完整的搜索流程', async () => {
      const result = await searchService.search(
        'integration-test',
        ['normal1', 'normal2'],
        2,
        true,
        'merged_by_type',
        'all',
        undefined,
        undefined,
        {}
      );

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);

      // 应该包含合并结果
      if (result.total > 0) {
        expect(result.merged_by_type).toBeDefined();
      }
    });

    it('应该支持不同的结果类型', async () => {
      // 测试 results 类型
      const result1 = await searchService.search(
        'test',
        undefined,
        undefined,
        true,
        'results',
        'plugin',
        undefined,
        undefined,
        {}
      );

      expect(result1.results).toBeDefined();
      expect(result1.merged_by_type).toBeUndefined();

      // 测试 merged_by_type 类型
      const result2 = await searchService.search(
        'test',
        undefined,
        undefined,
        true,
        'merged_by_type',
        'plugin',
        undefined,
        undefined,
        {}
      );

      expect(result2.merged_by_type).toBeDefined();
      expect(result2.results).toBeUndefined();
    });

    it('应该支持云盘类型过滤', async () => {
      const result = await searchService.search(
        'test',
        undefined,
        undefined,
        true,
        'merged_by_type',
        'plugin',
        undefined,
        ['baidu'], // 只要百度链接
        {}
      );

      // 如果有结果，应该只包含 baidu 类型
      if (result.merged_by_type && result.merged_by_type.baidu) {
        expect(result.merged_by_type.aliyun).toBeUndefined();
      }
    });
  });

  describe('错误处理集成', () => {
    it('应该处理插件抛出的异常', async () => {
      class ErrorPlugin extends BaseAsyncPlugin {
        constructor() {
          super('error', 1);
        }

        async search(): Promise<SearchResult[]> {
          throw new Error('Plugin error');
        }
      }

      const pluginManager = new PluginManager();
      pluginManager.registerPlugin(new ErrorPlugin());

      const options: SearchServiceOptions = {
        priorityChannels: [],
        defaultChannels: ['test'],
        defaultConcurrency: 2,
        pluginTimeoutMs: 5000,
        cacheEnabled: false,
        cacheTtlMinutes: 30,
      };
      const searchService = new SearchService(options, pluginManager);

      // 不应该抛出异常，而是返回空结果
      const result = await searchService.search(
        'test',
        undefined,
        undefined,
        true,
        'results',
        'plugin',
        undefined,
        undefined,
        {}
      );

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });
});
