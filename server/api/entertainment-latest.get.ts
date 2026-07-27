import { defineEventHandler, setResponseHeaders } from "h3";
import {
  getEntertainmentLatestCache,
  saveEntertainmentLatestCache,
} from "../core/services/d1EntertainmentLatestCache";
import {
  ENTERTAINMENT_REFRESH_INTERVAL_MS,
  fetchLatestEntertainment,
  type EntertainmentLatestData,
} from "../core/services/entertainmentLatestService";
import {
  deferCloudflareTask,
  getFavoritesDatabase,
} from "../utils/cloudflareBindings";

const FRESH_FOR_MS = ENTERTAINMENT_REFRESH_INTERVAL_MS;
const CACHE_CONTROL =
  "public, max-age=300, s-maxage=7200, stale-while-revalidate=7200";

function payload(
  data: EntertainmentLatestData,
  stale: boolean,
  cache: "D1" | "UPSTREAM"
) {
  return {
    code: 0 as const,
    message: "success" as const,
    data: {
      ...data,
      stale,
      cache,
    },
  };
}

async function refresh(
  database: ReturnType<typeof getFavoritesDatabase>
): Promise<EntertainmentLatestData> {
  const data = await fetchLatestEntertainment(12);
  if (database) {
    await saveEntertainmentLatestCache(database, data).catch((error) => {
      console.warn(
        "[entertainment-latest] D1 写入失败:",
        error instanceof Error ? error.message : String(error)
      );
    });
  }
  return data;
}

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    "Cache-Control": CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
  });

  const database = getFavoritesDatabase(event);
  const cached = database
    ? await getEntertainmentLatestCache(database).catch(() => undefined)
    : undefined;
  const now = Date.now();

  if (cached && now - cached.updatedAt <= FRESH_FOR_MS) {
    return payload(cached, false, "D1");
  }

  if (cached) {
    const task = refresh(database).catch((error) => {
      console.warn(
        "[entertainment-latest] 后台更新失败:",
        error instanceof Error ? error.message : String(error)
      );
    });
    if (!deferCloudflareTask(event, task)) void task;
    return payload(cached, true, "D1");
  }

  try {
    return payload(await refresh(database), false, "UPSTREAM");
  } catch (error) {
    console.warn(
      "[entertainment-latest] 上游不可用:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      code: 0 as const,
      message: "success" as const,
      data: {
        movies: [],
        tv: [],
        collections: [],
        updatedAt: 0,
        stale: true,
        cache: "UPSTREAM" as const,
      },
    };
  }
});
