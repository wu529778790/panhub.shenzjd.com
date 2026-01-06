import { defineEventHandler, getHeader, sendError } from 'h3';
import { createErrorResponse } from '../core/utils/error-handler';
import { AppError } from '../core/errors/app-error';
import { RATE_LIMIT } from '../core/constants';
import type { RateLimitConfig } from '../core/config';

/**
 * 速率限制中间件
 * 基于 IP 地址限制请求频率
 */

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: RATE_LIMIT.WINDOW_MS,
  maxRequests: RATE_LIMIT.MAX_REQUESTS,
  skipPaths: ['/api/health', '/api/hot-search-stats'], // 健康检查跳过限速
};

// 简单的内存存储（生产环境应使用 Redis）
const store = new Map<string, { count: number; resetTime: number }>();

/**
 * 获取客户端 IP
 */
function getClientIP(event: any): string {
  // 优先从 X-Forwarded-For 获取
  const forwarded = getHeader(event, 'x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // 回退到 remoteAddress
  return event.node?.req?.socket?.remoteAddress || 'unknown';
}

/**
 * 清理过期记录
 */
function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, record] of store) {
    if (record.resetTime <= now) {
      store.delete(key);
    }
  }
}

/**
 * 检查速率限制
 */
function checkRateLimit(ip: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // 清理过期记录（每 100 次请求或随机触发）
  if (store.size > 1000 || Math.random() < 0.01) {
    cleanupExpired();
  }

  let record = store.get(ip);

  // 如果记录不存在或已过期，创建新记录
  if (!record || record.resetTime <= now) {
    record = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    store.set(ip, record);
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: record.resetTime };
  }

  // 检查是否超过限制
  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // 增加计数
  record.count++;
  return { allowed: true, remaining: config.maxRequests - record.count, resetTime: record.resetTime };
}

/**
 * 格式化剩余时间
 */
function formatResetTime(resetTime: number): string {
  const seconds = Math.ceil((resetTime - Date.now()) / 1000);
  return `${seconds}s`;
}

export default defineEventHandler(async (event, next) => {
  // 获取配置
  const config = useRuntimeConfig();
  const rateLimitConfig: RateLimitConfig = {
    ...DEFAULT_CONFIG,
    ...(config.rateLimit || {}),
  };

  // 检查是否跳过限速
  const path = event.node.req.url || '';
  if (rateLimitConfig.skipPaths.some(skipPath => path.startsWith(skipPath))) {
    return next();
  }

  // 获取客户端 IP
  const ip = getClientIP(event);

  // 检查速率限制
  const { allowed, remaining, resetTime } = checkRateLimit(ip, rateLimitConfig);

  // 设置响应头
  event.node.res.setHeader('X-RateLimit-Limit', String(rateLimitConfig.maxRequests));
  event.node.res.setHeader('X-RateLimit-Remaining', String(remaining));
  event.node.res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

  if (!allowed) {
    const error = AppError.tooManyRequests(
      'RATE_LIMIT_EXCEEDED',
      `请求过于频繁，请 ${formatResetTime(resetTime)} 后重试`,
      { limit: rateLimitConfig.maxRequests, windowMs: rateLimitConfig.windowMs }
    );
    return sendError(event, createErrorResponse(error));
  }

  return next();
});
