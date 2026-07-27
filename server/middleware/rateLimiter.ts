import { defineEventHandler, getHeader, createError } from "h3";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 路径 → { limit, windowMs }
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  // 前端会按插件和频道批次渐进返回结果。40 次可覆盖约 3 次完整搜索，
  // 同时继续限制脚本化高频调用。
  "/api/search": { limit: 40, windowMs: 60_000 },
  "/api/hot-searches": { limit: 30, windowMs: 60_000 },
  "/api/ai/analyze": { limit: 6, windowMs: 60_000 },
  "/api/favorites/sync": { limit: 30, windowMs: 60_000 },
  "/api/link-health/query": { limit: 30, windowMs: 60_000 },
  "/api/link-health/report": { limit: 20, windowMs: 60_000 },
  "/api/seo/event": { limit: 12, windowMs: 60_000 },
  "/api/seo/report": { limit: 20, windowMs: 60_000 },
  "/api/geo/search": { limit: 20, windowMs: 60_000 },
  "/api/geo/pages": { limit: 30, windowMs: 60_000 },
  "/api/ops/geo": { limit: 30, windowMs: 60_000 },
  "/api/ops/geo/run": { limit: 6, windowMs: 60_000 },
  "/api/traffic/event": { limit: 40, windowMs: 60_000 },
  "/api/ops/traffic": { limit: 30, windowMs: 60_000 },
};

const DEFAULT_LIMIT = { limit: 60, windowMs: 60_000 };
const CLEANUP_INTERVAL = 5 * 60_000; // 5 分钟清理一次

const store = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();

function getClientIp(event: any): string {
  return (
    getHeader(event, "x-forwarded-for")?.split(",")[0]?.trim() ||
    getHeader(event, "x-real-ip") ||
    "unknown"
  );
}

function getRateLimit(pathname: string) {
  // 精确匹配
  if (RATE_LIMITS[pathname]) return RATE_LIMITS[pathname];
  // 前缀匹配（/api/hot-searches POST 和 GET 共享限制）
  for (const [prefix, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(prefix)) return config;
  }
  return DEFAULT_LIMIT;
}

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key);
  }
}

export default defineEventHandler((event) => {
  // 只限制 API 路由（健康检查排除限流）
  const path = event.path || "";
  if (!path.startsWith("/api/")) return;
  if (path === "/api/health") return;

  cleanup();

  const ip = getClientIp(event);
  const { limit, windowMs } = getRateLimit(path);
  const key = `${ip}:${path}`;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    throw createError({
      statusCode: 429,
      message: `请求过于频繁，请${retryAfter}秒后重试`,
      data: { retryAfter },
    });
  }
});
