/**
 * 应用常量
 * 集中管理所有常量，避免魔法数字和字符串
 */

// ==================== HTTP 状态码 ====================
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ==================== 错误代码 ====================
export const ERROR_CODES = {
  // 验证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMETER: 'INVALID_PARAMETER',

  // 认证授权错误
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // 资源错误
  NOT_FOUND: 'NOT_FOUND',

  // 速率限制
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 搜索错误
  SEARCH_TIMEOUT: 'SEARCH_TIMEOUT',
  PLUGIN_ERROR: 'PLUGIN_ERROR',

  // 系统错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // 数据库错误
  DB_ERROR: 'DB_ERROR',
  DB_NOT_FOUND: 'DB_NOT_FOUND',
} as const;

// ==================== 搜索配置 ====================
export const SEARCH = {
  MAX_CONCURRENCY: 20,
  MIN_CONCURRENCY: 1,
  DEFAULT_CONCURRENCY: 5,
  MAX_KEYWORD_LENGTH: 100,
  MIN_KEYWORD_LENGTH: 1,
  PLUGIN_TIMEOUT_MS: 10000,
  MAX_CHANNELS: 50,
  MAX_PLUGINS: 20,
  MAX_CLOUD_TYPES: 10,
} as const;

// ==================== 缓存配置 ====================
export const CACHE = {
  DEFAULT_TTL_MINUTES: 30,
  MAX_SIZE: 1000,
  MAX_MEMORY_BYTES: 100 * 1024 * 1024, // 100MB
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5分钟
  MEMORY_THRESHOLD: 0.8, // 80% 触发清理
} as const;

// ==================== 速率限制 ====================
export const RATE_LIMIT = {
  WINDOW_MS: 60 * 1000, // 1分钟
  MAX_REQUESTS: 60,     // 每分钟60次
  MAX_REQUESTS_PER_IP: 60,
} as const;

// ==================== 热搜配置 ====================
export const HOT_SEARCH = {
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 30,
  MIN_LIMIT: 1,
  SCORE_THRESHOLD: 1,
  MAX_TERM_LENGTH: 100,
} as const;

// ==================== 正则表达式 ====================
export const REGEX = {
  // 搜索关键词：仅支持中文、英文、数字、空格
  KEYWORD: /^[a-zA-Z0-9\u4e00-\u9fa5\s]+$/,

  // URL 验证
  URL: /^https?:\/\/.+/,

  // IP 地址
  IP: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,

  // 逗号分隔的字符串
  COMMA_SEPARATED: /^[a-zA-Z0-9_,-\s]+$/,
} as const;

// ==================== 消息 ====================
export const MESSAGES = {
  SUCCESS: 'success',
  ERROR: 'error',
  VALIDATION_FAILED: '参数验证失败',
  RATE_LIMIT_EXCEEDED: '请求过于频繁',
  NOT_FOUND: '资源未找到',
  INTERNAL_ERROR: '服务器内部错误',
  SEARCH_TIMEOUT: '搜索超时',
} as const;

// ==================== 时间 ====================
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

// ==================== 数据源 ====================
export const DATA_SOURCES = {
  ALL: 'all',
  TG: 'tg',
  PLUGIN: 'plugin',
} as const;

// ==================== 返回结果类型 ====================
export const RESPONSE_TYPES = {
  MERGED_BY_TYPE: 'merged_by_type',
  RESULTS: 'results',
  ALL: 'all',
} as const;

// ==================== 云盘类型 ====================
export const CLOUD_TYPES = {
  BAIDU: 'baidu',
  ALIYUN: 'aliyun',
  QUARK: 'quark',
  TIANYI: 'tianyi',
  XUNLEI: 'xunlei',
  MOBILE: 'mobile',
  '115': '115',
  '123': '123',
  UC: 'uc',
  PIKPAK: 'pikpak',
  LANZOU: 'lanzou',
  MAGNET: 'magnet',
  ED2K: 'ed2k',
  OTHERS: 'others',
} as const;

// ==================== 日志级别 ====================
export const LOG_LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

// ==================== 环境 ====================
export const ENV = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;
