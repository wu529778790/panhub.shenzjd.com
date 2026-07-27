import {
  createError,
  defineEventHandler,
  getHeader,
  readBody,
  setHeader,
  setResponseStatus,
} from "h3";
import type { AiResourceAnalysis } from "../../../types/search";
import {
  analyzeResourcesWithAi,
  type AiResourceInput,
} from "../../core/services/aiAnalysisService";
import {
  getCloudflareEnv,
  getFavoritesDatabase,
  type D1DatabaseLike,
} from "../../utils/cloudflareBindings";

const MAX_ITEMS = 16;
const MAX_BODY_BYTES = 16_000;
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const PROMPT_VERSION = "resource-cleanup-v1";

function validateItems(value: unknown): AiResourceInput[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ITEMS) {
    throw createError({
      statusCode: 400,
      statusMessage: `items must contain 1-${MAX_ITEMS} resources`,
    });
  }

  return value.map((raw: any) => {
    const id = typeof raw?.id === "string" ? raw.id.trim() : "";
    const title = typeof raw?.title === "string" ? raw.title.trim() : "";
    const platform =
      typeof raw?.platform === "string" ? raw.platform.trim() : "";
    const datetime =
      typeof raw?.datetime === "string" ? raw.datetime.trim() : "";

    if (!id || id.length > 240 || !title || title.length > 500) {
      throw createError({
        statusCode: 400,
        statusMessage: "invalid resource item",
      });
    }

    return {
      id,
      title,
      platform: platform.slice(0, 40),
      datetime: datetime.slice(0, 60),
    };
  });
}

async function hashText(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function cacheKey(item: AiResourceInput, model: string): Promise<string> {
  return hashText(
    `${PROMPT_VERSION}\n${model}\n${item.title}\n${item.platform}\n${item.datetime || ""}`
  );
}

async function readCache(
  database: D1DatabaseLike | undefined,
  key: string
): Promise<AiResourceAnalysis | undefined> {
  if (!database) return undefined;
  try {
    const row = await database
      .prepare(
        "SELECT result_json FROM ai_analysis_cache WHERE cache_key = ? AND expires_at > ?"
      )
      .bind(key, Math.floor(Date.now() / 1000))
      .first<{ result_json: string }>();
    return row?.result_json
      ? (JSON.parse(row.result_json) as AiResourceAnalysis)
      : undefined;
  } catch {
    return undefined;
  }
}

async function writeCache(
  database: D1DatabaseLike | undefined,
  key: string,
  result: AiResourceAnalysis
): Promise<void> {
  if (!database) return;
  const now = Math.floor(Date.now() / 1000);
  try {
    await database
      .prepare(
        `INSERT INTO ai_analysis_cache (cache_key, result_json, created_at, expires_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(cache_key) DO UPDATE SET
           result_json = excluded.result_json,
           created_at = excluded.created_at,
           expires_at = excluded.expires_at`
      )
      .bind(key, JSON.stringify(result), now, now + CACHE_TTL_SECONDS)
      .run();
  } catch {
    // AI results remain usable even when the optional cache is unavailable.
  }
}

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  const contentLength = Number(getHeader(event, "content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: "AI request is too large",
    });
  }

  const body = await readBody<{ items?: unknown }>(event);
  if (new TextEncoder().encode(JSON.stringify(body ?? null)).byteLength > MAX_BODY_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: "AI request is too large",
    });
  }
  const items = validateItems(body?.items);
  const env = getCloudflareEnv(event);
  const runtimeConfig = useRuntimeConfig();
  const apiKey = String(env.AI_API_KEY || process.env.AI_API_KEY || "").trim();
  const baseUrl = String(
    env.AI_BASE_URL || runtimeConfig.aiBaseUrl || ""
  ).trim();
  const model = String(env.AI_MODEL || runtimeConfig.aiModel || "").trim();

  if (!apiKey || !baseUrl || !model) {
    throw createError({
      statusCode: 503,
      statusMessage: "AI service is not configured",
    });
  }

  const database = getFavoritesDatabase(event);
  const keys = await Promise.all(items.map((item) => cacheKey(item, model)));
  const cached = await Promise.all(keys.map((key) => readCache(database, key)));
  const results = new Map<string, AiResourceAnalysis>();
  const misses: AiResourceInput[] = [];

  for (const [index, item] of items.entries()) {
    const hit = cached[index];
    if (hit) results.set(item.id, { ...hit, id: item.id });
    else misses.push(item);
  }

  if (misses.length > 0) {
    const analyzed = await analyzeResourcesWithAi(misses, {
      apiKey,
      baseUrl,
      model,
      timeoutMs: 35_000,
    });

    const keyById = new Map(items.map((item, index) => [item.id, keys[index]]));
    await Promise.all(
      analyzed.map(async (result) => {
        results.set(result.id, result);
        const key = keyById.get(result.id);
        if (key) await writeCache(database, key, result);
      })
    );
  }

  const ordered = items
    .map((item) => results.get(item.id))
    .filter((item): item is AiResourceAnalysis => !!item);

  if (ordered.length === 0) {
    setResponseStatus(event, 502);
  }

  return {
    code: ordered.length > 0 ? 0 : 1,
    message: ordered.length > 0 ? "success" : "AI returned no usable results",
    data: {
      items: ordered,
      cached: cached.filter(Boolean).length,
      model,
    },
  };
});
