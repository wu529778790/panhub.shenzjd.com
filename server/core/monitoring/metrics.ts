/**
 * 应用监控指标收集器
 *
 * 功能：
 * - API 请求统计
 * - 搜索性能指标
 * - 插件执行统计
 * - 错误率追踪
 * - 缓存命中率
 * - 内存使用情况
 */

import type { SearchRequest } from '../types/models';

export interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  statusCodes: Record<number, number>;
}

export interface SearchMetrics {
  totalSearches: number;
  totalResults: number;
  averageSearchTime: number;
  pluginExecutions: Record<string, PluginExecutionStats>;
  concurrentSearches: number;
}

export interface PluginExecutionStats {
  calls: number;
  successes: number;
  failures: number;
  averageTime: number;
  totalResults: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  byCode: Record<string, number>;
  byType: Record<string, number>;
  lastError?: {
    code: string;
    message: string;
    timestamp: number;
  };
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  size: number;
}

export interface SystemMetrics {
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  uptime: number;
  eventLoopLag: number;
}

export class MetricsCollector {
  private static instance: MetricsCollector;

  // API 指标
  private apiMetrics: ApiMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    statusCodes: {},
  };

  // 搜索指标
  private searchMetrics: SearchMetrics = {
    totalSearches: 0,
    totalResults: 0,
    averageSearchTime: 0,
    pluginExecutions: {},
    concurrentSearches: 0,
  };

  // 错误指标
  private errorMetrics: ErrorMetrics = {
    totalErrors: 0,
    byCode: {},
    byType: {},
  };

  // 缓存指标（从外部注入）
  private cacheMetrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    hitRate: 0,
    size: 0,
  };

  // 响应时间历史（用于计算平均值）
  private responseTimes: number[] = [];
  private searchTimes: number[] = [];
  private readonly MAX_HISTORY = 1000;

  private constructor() {}

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  // ==================== API 指标 ====================

  recordApiRequest(statusCode: number, responseTime: number): void {
    this.apiMetrics.totalRequests++;

    if (statusCode >= 200 && statusCode < 300) {
      this.apiMetrics.successfulRequests++;
    } else {
      this.apiMetrics.failedRequests++;
    }

    // 状态码统计
    this.apiMetrics.statusCodes[statusCode] =
      (this.apiMetrics.statusCodes[statusCode] || 0) + 1;

    // 响应时间
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.MAX_HISTORY) {
      this.responseTimes.shift();
    }
    this.apiMetrics.averageResponseTime =
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  // ==================== 搜索指标 ====================

  recordSearchStart(): void {
    this.searchMetrics.concurrentSearches++;
    this.searchMetrics.totalSearches++;
  }

  recordSearchEnd(results: number, duration: number): void {
    this.searchMetrics.concurrentSearches--;
    this.searchMetrics.totalResults += results;

    this.searchTimes.push(duration);
    if (this.searchTimes.length > this.MAX_HISTORY) {
      this.searchTimes.shift();
    }
    this.searchMetrics.averageSearchTime =
      this.searchTimes.reduce((a, b) => a + b, 0) / this.searchTimes.length;
  }

  recordPluginExecution(
    pluginName: string,
    success: boolean,
    duration: number,
    results: number
  ): void {
    if (!this.searchMetrics.pluginExecutions[pluginName]) {
      this.searchMetrics.pluginExecutions[pluginName] = {
        calls: 0,
        successes: 0,
        failures: 0,
        averageTime: 0,
        totalResults: 0,
      };
    }

    const stats = this.searchMetrics.pluginExecutions[pluginName];
    stats.calls++;
    stats.totalResults += results;

    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }

    // 更新平均时间
    const totalTime = stats.averageTime * (stats.calls - 1) + duration;
    stats.averageTime = totalTime / stats.calls;
  }

  // ==================== 错误指标 ====================

  recordError(code: string, type: string, message: string): void {
    this.errorMetrics.totalErrors++;

    this.errorMetrics.byCode[code] =
      (this.errorMetrics.byCode[code] || 0) + 1;

    this.errorMetrics.byType[type] =
      (this.errorMetrics.byType[type] || 0) + 1;

    this.errorMetrics.lastError = {
      code,
      message,
      timestamp: Date.now(),
    };
  }

  // ==================== 缓存指标 ====================

  updateCacheMetrics(metrics: Partial<CacheMetrics>): void {
    this.cacheMetrics = { ...this.cacheMetrics, ...metrics };

    // 计算命中率
    const total = this.cacheMetrics.hits + this.cacheMetrics.misses;
    if (total > 0) {
      this.cacheMetrics.hitRate = (this.cacheMetrics.hits / total) * 100;
    }
  }

  // ==================== 系统指标 ====================

  getSystemMetrics(): SystemMetrics {
    const mem = process.memoryUsage();
    const now = Date.now();
    const uptime = process.uptime ? process.uptime() : 0;

    return {
      memoryUsage: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024),
      },
      uptime: Math.round(uptime),
      eventLoopLag: this.calculateEventLoopLag(),
    };
  }

  private calculateEventLoopLag(): number {
    const start = process.hrtime.bigint();
    // 强制事件循环处理一些工作
    setImmediate(() => {});
    const end = process.hrtime.bigint();
    return Number(end - start) / 1000000; // 转换为毫秒
  }

  // ==================== 获取所有指标 ====================

  getAllMetrics() {
    return {
      timestamp: new Date().toISOString(),
      api: this.apiMetrics,
      search: this.searchMetrics,
      errors: this.errorMetrics,
      cache: this.cacheMetrics,
      system: this.getSystemMetrics(),
    };
  }

  // ==================== 重置指标 ====================

  resetApiMetrics(): void {
    this.apiMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      statusCodes: {},
    };
    this.responseTimes = [];
  }

  resetSearchMetrics(): void {
    this.searchMetrics = {
      totalSearches: 0,
      totalResults: 0,
      averageSearchTime: 0,
      pluginExecutions: {},
      concurrentSearches: 0,
    };
    this.searchTimes = [];
  }

  resetErrorMetrics(): void {
    this.errorMetrics = {
      totalErrors: 0,
      byCode: {},
      byType: {},
    };
  }

  resetAllMetrics(): void {
    this.resetApiMetrics();
    this.resetSearchMetrics();
    this.resetErrorMetrics();
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0,
      size: 0,
    };
  }

  // ==================== 工具方法 ====================

  getApiSummary(): string {
    const m = this.apiMetrics;
    return `API: ${m.totalRequests} 请求, ${m.successfulRequests} 成功, ${m.failedRequests} 失败, 平均 ${m.averageResponseTime.toFixed(2)}ms`;
  }

  getSearchSummary(): string {
    const m = this.searchMetrics;
    return `搜索: ${m.totalSearches} 次, ${m.totalResults} 条结果, 平均 ${m.averageSearchTime.toFixed(2)}ms, 并发 ${m.concurrentSearches}`;
  }

  getErrorSummary(): string {
    const m = this.errorMetrics;
    return `错误: ${m.totalErrors} 个, 主要: ${Object.keys(m.byCode).slice(0, 3).join(', ')}`;
  }

  getCacheSummary(): string {
    const c = this.cacheMetrics;
    return `缓存: ${c.hitRate.toFixed(1)}% 命中率, ${c.hits}/${c.misses}, ${c.size} 项`;
  }
}

// 全局单例
export const metrics = MetricsCollector.getInstance();
