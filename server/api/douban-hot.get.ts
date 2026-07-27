import { createError, defineEventHandler, getQuery, getRequestURL } from "h3";
import {
  fetchDoubanHotByCategory,
  isUsableDoubanHotPage,
  type DoubanHotPageResult,
} from "../core/services/doubanHotService";
import {
  getD1DoubanHotCache,
  saveD1DoubanHotCache,
} from "../core/services/d1DoubanHotCache";
import { getFavoritesDatabase } from "../utils/cloudflareBindings";

const EDGE_CACHE_VERSION = "douban-v3";
const FRESH_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const STALE_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400";

interface DoubanHotPayload {
  code: 0;
  message: "success";
  data: DoubanHotPageResult & {
    category: string;
    page: number;
    limit: number;
    stale: boolean;
    cachedAt?: number;
  };
}

function createPayload(
  category: string,
  page: number,
  limit: number,
  data: DoubanHotPageResult,
  stale = false,
  cachedAt?: number
): DoubanHotPayload {
  return {
    code: 0,
    message: "success",
    data: {
      category,
      items: data.items,
      hasMore: data.hasMore,
      page,
      limit,
      stale,
      ...(cachedAt ? { cachedAt } : {}),
    },
  };
}

function readPayload(value: unknown, page: number): DoubanHotPayload | undefined {
  const payload = value as DoubanHotPayload | undefined;
  if (
    payload?.code !== 0 ||
    !payload.data ||
    !Array.isArray(payload.data.items)
  ) {
    return undefined;
  }

  const data = {
    items: payload.data.items,
    hasMore: Boolean(payload.data.hasMore),
  };
  return isUsableDoubanHotPage(data, page) ? payload : undefined;
}

function createEdgeCacheKey(
  requestUrl: URL,
  category: string,
  page: number,
  limit: number
): Request {
  const cacheUrl = new URL(requestUrl.origin + requestUrl.pathname);
  cacheUrl.searchParams.set("category", category);
  cacheUrl.searchParams.set("page", String(page));
  cacheUrl.searchParams.set("limit", String(limit));
  cacheUrl.searchParams.set("_cache", EDGE_CACHE_VERSION);
  return new Request(cacheUrl.toString(), { method: "GET" });
}

function defer(event: any, promise: Promise<unknown>): boolean {
  const contexts = [
    event.context?.cloudflare?.context,
    event.context?.cloudflare?.ctx,
    event.context,
  ];
  const executionContext = contexts.find(
    (candidate) => candidate && typeof candidate.waitUntil === "function"
  );
  if (!executionContext) return false;
  executionContext.waitUntil(promise);
  return true;
}

function runInBackground(event: any, promise: Promise<unknown>) {
  const guarded = promise.catch((error) => {
    console.warn(
      "[douban-hot] 后台刷新失败:",
      error instanceof Error ? error.message : String(error)
    );
  });
  if (!defer(event, guarded)) {
    void guarded;
  }
}

async function settleInBackground(event: any, promises: Promise<unknown>[]) {
  const task = Promise.allSettled(promises);
  if (!defer(event, task)) await task;
}

async function fetchFreshPage(
  category: string,
  page: number,
  limit: number
): Promise<DoubanHotPageResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await fetchDoubanHotByCategory(category, page, limit);
      if (!isUsableDoubanHotPage(data, page)) {
        throw new Error("upstream returned an empty first page");
      }
      return data;
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("upstream error");
}

function createJsonResponse(
  payload: DoubanHotPayload,
  cacheState: "HIT" | "MISS" | "STALE",
  cacheControl: string
): Response {
  return Response.json(payload, {
    headers: {
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "X-Haosouku-Cache": cacheState,
    },
  });
}

async function refreshCachedPage(
  edgeCache: Cache | undefined,
  database: ReturnType<typeof getFavoritesDatabase>,
  cacheKey: Request,
  category: string,
  page: number,
  limit: number
): Promise<void> {
  const data = await fetchFreshPage(category, page, limit);
  const payload = createPayload(category, page, limit, data);
  const response = createJsonResponse(payload, "MISS", FRESH_CACHE_CONTROL);
  const tasks: Promise<unknown>[] = [];

  if (edgeCache) tasks.push(edgeCache.put(cacheKey, response.clone()));
  if (database) tasks.push(saveD1DoubanHotCache(database, category, page, limit, data));
  await Promise.allSettled(tasks);
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const category = (query.category as string) || "douban-top250";
  const rawPage = parseInt((query.page as string) || "1", 10);
  const rawLimit = parseInt((query.limit as string) || "25", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 100 ? rawLimit : 25;
  const database = getFavoritesDatabase(event);
  const edgeCache = (globalThis as any).caches?.default as Cache | undefined;
  const cacheKey = createEdgeCacheKey(getRequestURL(event), category, page, limit);

  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) {
      const cachedPayload = readPayload(await cached.clone().json().catch(() => undefined), page);
      if (cachedPayload) {
        const tasks: Promise<unknown>[] = [];
        if (database) {
          tasks.push(
            saveD1DoubanHotCache(database, category, page, limit, cachedPayload.data)
          );
        }
        if (tasks.length) await settleInBackground(event, tasks);

        const headers = new Headers(cached.headers);
        headers.set("X-Haosouku-Cache", "HIT");
        return new Response(cached.body, { status: cached.status, headers });
      }

      await settleInBackground(event, [edgeCache.delete(cacheKey)]);
    }
  }

  // 边缘缓存按机房隔离。新机房首次命中时先从 D1 返回最近一次成功片单，
  // 再利用 waitUntil 后台刷新，避免用户等待豆瓣上游的超时和重试。
  if (database) {
    const stale = await getD1DoubanHotCache(database, category, page, limit).catch(
      () => undefined
    );
    if (stale) {
      const payload = createPayload(category, page, limit, stale, true, stale.updatedAt);
      runInBackground(
        event,
        refreshCachedPage(
          edgeCache,
          database,
          cacheKey,
          category,
          page,
          limit
        )
      );
      return createJsonResponse(payload, "STALE", STALE_CACHE_CONTROL);
    }
  }

  try {
    const data = await fetchFreshPage(category, page, limit);
    const payload = createPayload(category, page, limit, data);
    const response = createJsonResponse(payload, "MISS", FRESH_CACHE_CONTROL);
    const tasks: Promise<unknown>[] = [];

    if (edgeCache) tasks.push(edgeCache.put(cacheKey, response.clone()));
    if (database) tasks.push(saveD1DoubanHotCache(database, category, page, limit, data));
    if (tasks.length) await settleInBackground(event, tasks);

    return response;
  } catch (error: any) {
    if (database) {
      const stale = await getD1DoubanHotCache(database, category, page, limit).catch(() => undefined);
      if (stale) {
        const payload = createPayload(category, page, limit, stale, true, stale.updatedAt);
        const response = createJsonResponse(payload, "STALE", STALE_CACHE_CONTROL);
        if (edgeCache) {
          await settleInBackground(event, [edgeCache.put(cacheKey, response.clone())]);
        }
        return response;
      }
    }

    throw createError({
      statusCode: 502,
      message: `获取豆瓣榜单失败: ${error?.message || "upstream error"}`,
    });
  }
});
