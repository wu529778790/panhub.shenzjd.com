import { defineEventHandler, getQuery, createError, getRequestURL } from "h3";

const ALLOWED_HOSTS = /^img[1-9]\.doubanio\.com$/;

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const raw = (query.url as string) || "";
  const url = decodeURIComponent(raw);
  const requestedWidth = Number.parseInt(String(query.w || "360"), 10);
  const width = Number.isFinite(requestedWidth)
    ? Math.max(80, Math.min(640, requestedWidth))
    : 360;

  if (!url || !url.startsWith("https://")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid url" });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid url" });
  }

  if (!ALLOWED_HOSTS.test(parsed.hostname)) {
    throw createError({ statusCode: 403, statusMessage: "Host not allowed" });
  }

  // 防止 SSRF 绕过：URL 中不得包含用户信息段或非标准端口
  if (parsed.username || parsed.password || parsed.port) {
    throw createError({ statusCode: 403, statusMessage: "Host not allowed" });
  }

  const upstreamUrl = new URL(parsed);
  if (width <= 300) {
    upstreamUrl.pathname = upstreamUrl.pathname.replace(
      "/m_ratio_poster/",
      "/s_ratio_poster/"
    );
  }

  const edgeCache = (globalThis as any).caches?.default as Cache | undefined;
  const cacheKey = new Request(getRequestURL(event).toString(), { method: "GET" });
  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Haosouku-Cache", "HIT");
      return new Response(cached.body, { status: cached.status, headers });
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const upstream = await fetch(upstreamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Referer": "https://movie.douban.com/",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: controller.signal,
      cf: {
        image: {
          width,
          fit: "scale-down",
          quality: 76,
          format: "auto",
        },
      },
    } as RequestInit & {
      cf: {
        image: {
          width: number;
          fit: "scale-down";
          quality: number;
          format: "auto";
        };
      };
    }).finally(() => clearTimeout(timer));

    if (!upstream.ok) {
      throw new Error(`upstream returned ${upstream.status}`);
    }
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      throw new Error("upstream returned a non-image response");
    }

    const response = new Response(upstream.body, {
      headers: {
        "Cache-Control": "public, max-age=2592000, s-maxage=31536000, immutable",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });

    if (edgeCache) {
      const cacheWrite = edgeCache.put(cacheKey, response.clone());
      const waitUntil = (event.context as any)?.waitUntil;
      if (typeof waitUntil === "function") waitUntil(cacheWrite);
      else await cacheWrite;
    }

    const headers = new Headers(response.headers);
    headers.set("X-Haosouku-Cache", "MISS");
    return new Response(response.body, { status: 200, headers });
  } catch (error: any) {
    throw createError({
      statusCode: 503,
      statusMessage: "Image fetch timeout",
    });
  }
});
