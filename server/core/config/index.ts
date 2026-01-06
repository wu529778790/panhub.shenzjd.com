/**
 * 集中化配置管理
 * 统一管理所有配置项，避免配置分散
 */

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  windowMs: number;      // 时间窗口（毫秒）
  maxRequests: number;   // 每个窗口最大请求数
  skipPaths: string[];   // 跳过限速的路径
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  enabled: boolean;
  ttlMinutes: number;
  maxSize?: number;
  maxMemoryBytes?: number;
}

/**
 * 搜索配置
 */
export interface SearchConfig {
  defaultConcurrency: number;
  pluginTimeoutMs: number;
  priorityChannels: string[];
  defaultChannels: string[];
}

/**
 * 应用配置
 */
export interface AppConfig {
  rateLimit: RateLimitConfig;
  cache: CacheConfig;
  search: SearchConfig;
}

/**
 * 默认配置值
 */
export const DEFAULT_CONFIG: AppConfig = {
  rateLimit: {
    windowMs: 60 * 1000,  // 1 分钟
    maxRequests: 60,      // 每分钟 60 次
    skipPaths: ['/api/health', '/api/hot-search-stats'],
  },
  cache: {
    enabled: true,
    ttlMinutes: 30,
    maxSize: 1000,
    maxMemoryBytes: 100 * 1024 * 1024, // 100MB
  },
  search: {
    defaultConcurrency: 5,
    pluginTimeoutMs: 10000,
    priorityChannels: [],
    defaultChannels: [],
  },
};

/**
 * 从运行时配置构建 AppConfig
 */
export function buildAppConfig(runtimeConfig: any): AppConfig {
  return {
    rateLimit: runtimeConfig.rateLimit || DEFAULT_CONFIG.rateLimit,
    cache: {
      enabled: runtimeConfig.cacheEnabled ?? DEFAULT_CONFIG.cache.enabled,
      ttlMinutes: runtimeConfig.cacheTtlMinutes ?? DEFAULT_CONFIG.cache.ttlMinutes,
      maxSize: DEFAULT_CONFIG.cache.maxSize,
      maxMemoryBytes: DEFAULT_CONFIG.cache.maxMemoryBytes,
    },
    search: {
      defaultConcurrency: runtimeConfig.defaultConcurrency ?? DEFAULT_CONFIG.search.defaultConcurrency,
      pluginTimeoutMs: runtimeConfig.pluginTimeoutMs ?? DEFAULT_CONFIG.search.pluginTimeoutMs,
      priorityChannels: runtimeConfig.priorityChannels ?? DEFAULT_CONFIG.search.priorityChannels,
      defaultChannels: runtimeConfig.defaultChannels ?? DEFAULT_CONFIG.search.defaultChannels,
    },
  };
}

/**
 * 配置验证
 */
export function validateConfig(config: AppConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证速率限制
  if (config.rateLimit.windowMs <= 0) {
    errors.push('rateLimit.windowMs 必须大于 0');
  }
  if (config.rateLimit.maxRequests <= 0) {
    errors.push('rateLimit.maxRequests 必须大于 0');
  }

  // 验证缓存
  if (config.cache.ttlMinutes <= 0) {
    errors.push('cache.ttlMinutes 必须大于 0');
  }
  if (config.cache.maxSize && config.cache.maxSize <= 0) {
    errors.push('cache.maxSize 必须大于 0');
  }

  // 验证搜索
  if (config.search.defaultConcurrency <= 0) {
    errors.push('search.defaultConcurrency 必须大于 0');
  }
  if (config.search.defaultConcurrency > 20) {
    errors.push('search.defaultConcurrency 不能超过 20');
  }
  if (config.search.pluginTimeoutMs <= 0) {
    errors.push('search.pluginTimeoutMs 必须大于 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
