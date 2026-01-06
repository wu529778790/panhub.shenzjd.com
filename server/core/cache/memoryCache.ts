type CacheRecord<T> = { value: T; expireAt: number; size: number };

export interface MemoryCacheOptions {
  maxSize?: number; // 最大缓存条目数
  maxMemoryBytes?: number; // 最大内存占用（字节）
  cleanupInterval?: number; // 清理间隔（毫秒）
  memoryThreshold?: number; // 内存阈值百分比（0-1），达到时触发清理
}

export interface MemoryCacheStats {
  total: number; // 总条目数
  active: number; // 有效条目数
  expired: number; // 过期条目数
  maxSize: number; // 最大条目数
  memoryBytes: number; // 当前内存占用
  maxMemoryBytes: number; // 最大内存限制
  memoryUsagePercent: number; // 内存使用百分比
  hits: number; // 命中次数
  misses: number; // 未命中次数
  evictions: number; // 淘汰次数
}

export class MemoryCache<T = unknown> {
  private store = new Map<string, CacheRecord<T>>();
  private options: Required<MemoryCacheOptions>;
  private lastCleanup = 0;
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(options: MemoryCacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 1000,
      maxMemoryBytes: options.maxMemoryBytes ?? 100 * 1024 * 1024, // 默认 100MB
      cleanupInterval: options.cleanupInterval ?? 5 * 60 * 1000,
      memoryThreshold: options.memoryThreshold ?? 0.8, // 80% 触发清理
    };
  }

  /**
   * 估算对象大小（字节）
   */
  private estimateSize(value: T): number {
    try {
      if (value === null || value === undefined) return 8;
      if (typeof value === 'string') return value.length * 2;
      if (typeof value === 'number') return 8;
      if (typeof value === 'boolean') return 4;
      if (typeof value === 'object') {
        const str = JSON.stringify(value);
        return str ? str.length * 2 : 64;
      }
      return 64;
    } catch {
      return 64;
    }
  }

  /**
   * 计算当前总内存占用
   */
  private calculateMemoryUsage(): number {
    let total = 0;
    for (const [, record] of this.store) {
      total += record.size;
    }
    return total;
  }

  /**
   * 清理过期条目
   */
  private cleanupExpired(): number {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, rec] of this.store) {
      if (rec.expireAt <= now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.store.delete(key);
    }

    return expiredKeys.length;
  }

  /**
   * 按 LRU 淘汰指定数量的条目
   */
  private evictLRU(count: number): void {
    // Map 保持插入顺序，最旧的在最前面
    const iterator = this.store.keys();
    for (let i = 0; i < count; i++) {
      const { value: key, done } = iterator.next();
      if (done) break;
      this.store.delete(key);
      this.metrics.evictions++;
    }
  }

  /**
   * 按 LRU 淘汰直到释放指定内存
   */
  private evictForMemory(bytesToFree: number): void {
    let freed = 0;
    const iterator = this.store.keys();

    while (freed < bytesToFree) {
      const { value: key, done } = iterator.next();
      if (done) break;

      const rec = this.store.get(key);
      if (rec) {
        freed += rec.size;
        this.store.delete(key);
        this.metrics.evictions++;
      }
    }
  }

  /**
   * 智能清理：优先清理过期条目，如果还不够则按 LRU 淘汰
   */
  private smartCleanup(force: boolean = false): void {
    const now = Date.now();

    // 检查是否需要清理（时间间隔）
    if (!force && now - this.lastCleanup < this.options.cleanupInterval) {
      return;
    }

    this.lastCleanup = now;

    // 1. 清理过期条目
    const expiredCount = this.cleanupExpired();

    // 2. 检查容量限制
    const sizeOver = this.store.size - this.options.maxSize;
    if (sizeOver > 0) {
      this.evictLRU(sizeOver);
    }

    // 3. 检查内存限制
    const memoryUsage = this.calculateMemoryUsage();
    const memoryOver = memoryUsage - this.options.maxMemoryBytes;
    if (memoryOver > 0) {
      this.evictForMemory(memoryOver);
    }

    // 4. 检查内存阈值（百分比）
    const memoryPercent = memoryUsage / this.options.maxMemoryBytes;
    if (memoryPercent > this.options.memoryThreshold) {
      // 释放 10% 的内存
      const bytesToFree = memoryUsage * 0.1;
      this.evictForMemory(bytesToFree);
    }
  }

  get(key: string): { hit: boolean; value?: T } {
    this.smartCleanup();

    const rec = this.store.get(key);
    if (!rec) {
      this.metrics.misses++;
      return { hit: false };
    }

    if (rec.expireAt > Date.now()) {
      // 更新访问顺序（LRU）：删除后重新设置，移动到末尾
      this.store.delete(key);
      this.store.set(key, rec);
      this.metrics.hits++;
      return { hit: true, value: rec.value };
    }

    // 已过期，删除
    this.store.delete(key);
    this.metrics.misses++;
    return { hit: false };
  }

  set(key: string, value: T, ttlMs: number): void {
    this.smartCleanup();

    // 如果 key 已存在，先删除（更新内存占用）
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    const size = this.estimateSize(value);
    const record: CacheRecord<T> = {
      value,
      expireAt: Date.now() + Math.max(0, ttlMs),
      size,
    };

    // 检查容量和内存限制
    const currentMemory = this.calculateMemoryUsage();
    const needSizeEviction = this.store.size >= this.options.maxSize;
    const needMemoryEviction = (currentMemory + size) > this.options.maxMemoryBytes;

    if (needSizeEviction || needMemoryEviction) {
      // 1. 优先清理过期条目
      this.cleanupExpired();

      // 2. 检查清理后是否还需要淘汰
      const stillNeedSizeEviction = this.store.size >= this.options.maxSize;
      const currentMemoryAfter = this.calculateMemoryUsage();
      const stillNeedMemoryEviction = (currentMemoryAfter + size) > this.options.maxMemoryBytes;

      if (stillNeedSizeEviction) {
        // 需要淘汰多少个条目（+1 为新条目腾空间）
        const toEvict = this.store.size - this.options.maxSize + 1;
        this.evictLRU(toEvict);
      } else if (stillNeedMemoryEviction) {
        // 需要释放的内存
        const bytesToFree = (currentMemoryAfter + size) - this.options.maxMemoryBytes;
        this.evictForMemory(bytesToFree);
      }
    }

    // 插入新条目（Map 保持插入顺序，新条目在末尾）
    this.store.set(key, record);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.metrics = { hits: 0, misses: 0, evictions: 0 };
  }

  get size(): number {
    return this.store.size;
  }

  get memoryUsage(): number {
    return this.calculateMemoryUsage();
  }

  getStats(): MemoryCacheStats {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const [, rec] of this.store) {
      if (rec.expireAt > now) {
        active++;
      } else {
        expired++;
      }
    }

    const memoryBytes = this.calculateMemoryUsage();
    const memoryUsagePercent = (memoryBytes / this.options.maxMemoryBytes) * 100;

    return {
      total: this.store.size,
      active,
      expired,
      maxSize: this.options.maxSize,
      memoryBytes,
      maxMemoryBytes: this.options.maxMemoryBytes,
      memoryUsagePercent: Math.round(memoryUsagePercent * 100) / 100,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      evictions: this.metrics.evictions,
    };
  }

  /**
   * 手动触发清理（用于测试或紧急情况）
   */
  forceCleanup(): void {
    this.smartCleanup(true);
  }
}
