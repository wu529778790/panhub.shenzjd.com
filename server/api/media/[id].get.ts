import {
  createError,
  defineEventHandler,
  getRouterParam,
  setResponseHeaders,
} from "h3";
import {
  getD1MediaDetailCache,
  saveD1MediaDetailCache,
} from "../../core/services/d1MediaDetailCache";
import {
  fetchDoubanMediaDetail,
  isValidDoubanSubjectId,
  MEDIA_DETAIL_REFRESH_INTERVAL_MS,
  type MediaDetail,
} from "../../core/services/mediaDetailService";
import {
  deferCloudflareTask,
  getFavoritesDatabase,
} from "../../utils/cloudflareBindings";

const CACHE_CONTROL =
  "public, max-age=300, s-maxage=7200, stale-while-revalidate=604800";

function payload(
  detail: MediaDetail,
  stale: boolean,
  cache: "D1" | "UPSTREAM"
) {
  return {
    code: 0 as const,
    message: "success" as const,
    data: {
      ...detail,
      stale,
      cache,
    },
  };
}

async function refresh(
  database: ReturnType<typeof getFavoritesDatabase>,
  id: string
): Promise<MediaDetail> {
  const detail = await fetchDoubanMediaDetail(id);
  if (database) {
    await saveD1MediaDetailCache(database, detail).catch((error) => {
      console.warn(
        `[media-detail] D1 写入失败 ${id}:`,
        error instanceof Error ? error.message : String(error)
      );
    });
  }
  return detail;
}

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, "id") || "").trim();
  if (!isValidDoubanSubjectId(id)) {
    throw createError({ statusCode: 400, message: "无效的影视条目 ID" });
  }

  setResponseHeaders(event, {
    "Cache-Control": CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
  });

  const database = getFavoritesDatabase(event);
  const cached = database
    ? await getD1MediaDetailCache(database, id).catch(() => undefined)
    : undefined;
  const now = Date.now();

  if (
    cached &&
    now - cached.updatedAt <= MEDIA_DETAIL_REFRESH_INTERVAL_MS
  ) {
    return payload(cached, false, "D1");
  }

  if (cached) {
    const task = refresh(database, id).catch((error) => {
      console.warn(
        `[media-detail] 后台更新失败 ${id}:`,
        error instanceof Error ? error.message : String(error)
      );
    });
    if (!deferCloudflareTask(event, task)) void task;
    return payload(cached, true, "D1");
  }

  try {
    return payload(await refresh(database, id), false, "UPSTREAM");
  } catch (error) {
    throw createError({
      statusCode: 502,
      message: `影视资料暂时无法获取: ${
        error instanceof Error ? error.message : "upstream error"
      }`,
    });
  }
});
