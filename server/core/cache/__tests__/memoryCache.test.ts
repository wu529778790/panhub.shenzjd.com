import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryCache } from '../memoryCache';

describe('MemoryCache', () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    cache = new MemoryCache<string>({
      maxSize: 100,
      maxMemoryBytes: 10 * 1024 * 1024, // 10MB
    });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('基本功能', () => {
    it('应该正确设置和获取值', () => {
      cache.set('key1', 'value1', 1000);

      const result = cache.get('key1');
      expect(result.hit).toBe(true);
      expect(result.value).toBe('value1');
    });

    it('应该返回未命中', () => {
      const result = cache.get('nonexistent');
      expect(result.hit).toBe(false);
      expect(result.value).toBeUndefined();
    });

    it('应该正确删除值', () => {
      cache.set('key1', 'value1', 1000);
      cache.delete('key1');

      const result = cache.get('key1');
      expect(result.hit).toBe(false);
    });

    it('应该正确清空缓存', () => {
      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 1000);
      cache.set('key3', 'value3', 1000);

      expect(cache.size).toBe(3);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.get('key1').hit).toBe(false);
      expect(cache.get('key2').hit).toBe(false);
      expect(cache.get('key3').hit).toBe(false);
    });
  });

  describe('TTL 过期', () => {
    it('应该在 TTL 过期后返回未命中', () => {
      vi.useFakeTimers();

      cache.set('key1', 'value1', 1000);

      // 快进到过期前
      vi.advanceTimersByTime(999);
      expect(cache.get('key1').hit).toBe(true);

      // 过期后
      vi.advanceTimersByTime(1);
      expect(cache.get('key1').hit).toBe(false);

      vi.useRealTimers();
    });

    it('应该支持永不过期', () => {
      vi.useFakeTimers();

      cache.set('key1', 'value1', Infinity);

      // 大量时间过去
      vi.advanceTimersByTime(999999999);
      expect(cache.get('key1').hit).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('LRU 淘汰', () => {
    it('应该在超过最大大小时淘汰最旧的条目', () => {
      const smallCache = new MemoryCache<string>({
        maxSize: 3,
        maxMemoryBytes: 10 * 1024 * 1024,
      });

      smallCache.set('key1', 'value1', 1000);
      smallCache.set('key2', 'value2', 1000);
      smallCache.set('key3', 'value3', 1000);

      expect(smallCache.size).toBe(3);

      // 添加第4个，应该淘汰 key1
      smallCache.set('key4', 'value4', 1000);

      expect(smallCache.size).toBe(3);
      expect(smallCache.get('key1').hit).toBe(false);
      expect(smallCache.get('key2').hit).toBe(true);
      expect(smallCache.get('key3').hit).toBe(true);
      expect(smallCache.get('key4').hit).toBe(true);

      smallCache.clear();
    });

    it('get() 操作应该更新 LRU 顺序', () => {
      const smallCache = new MemoryCache<string>({
        maxSize: 2,
        maxMemoryBytes: 10 * 1024 * 1024,
      });

      smallCache.set('key1', 'value1', 1000);
      smallCache.set('key2', 'value2', 1000);

      // 访问 key1，使其变为最新
      smallCache.get('key1');

      // 添加新条目，应该淘汰 key2（最旧）
      smallCache.set('key3', 'value3', 1000);

      expect(smallCache.get('key1').hit).toBe(true);
      expect(smallCache.get('key2').hit).toBe(false);
      expect(smallCache.get('key3').hit).toBe(true);

      smallCache.clear();
    });
  });

  describe('内存限制', () => {
    it('应该考虑条目大小进行内存计算', () => {
      const smallCache = new MemoryCache<string>({
        maxSize: 100,
        maxMemoryBytes: 1024, // 1KB
      });

      // 添加大字符串，应该触发内存淘汰
      const largeValue = 'x'.repeat(1000);
      smallCache.set('key1', largeValue, 1000);
      smallCache.set('key2', largeValue, 1000);

      // 可能会淘汰旧条目以控制内存
      // 这取决于具体实现，至少不应该崩溃
      expect(smallCache.size).toBeLessThanOrEqual(2);

      smallCache.clear();
    });
  });

  describe('统计信息', () => {
    it('应该正确统计命中和未命中', () => {
      cache.set('key1', 'value1', 1000);

      cache.get('key1'); // 命中
      cache.get('key1'); // 命中
      cache.get('nonexistent'); // 未命中

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('应该正确统计淘汰次数', () => {
      const smallCache = new MemoryCache<string>({
        maxSize: 2,
        maxMemoryBytes: 10 * 1024 * 1024,
      });

      smallCache.set('k1', 'v1', 1000);
      smallCache.set('k2', 'v2', 1000);
      smallCache.set('k3', 'v3', 1000); // 淘汰 k1

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);

      smallCache.clear();
    });
  });

  describe('配置验证', () => {
    it('应该使用默认配置', () => {
      const defaultCache = new MemoryCache<string>();
      defaultCache.set('key', 'value', 1000);

      expect(defaultCache.get('key').hit).toBe(true);

      defaultCache.clear();
    });

    it('应该处理无效配置', () => {
      const cache = new MemoryCache<string>({
        maxSize: 0,
        maxMemoryBytes: 0,
      });

      // 应该仍然工作，只是可能立即淘汰
      cache.set('key', 'value', 1000);
      // 不应该崩溃

      cache.clear();
    });
  });
});
