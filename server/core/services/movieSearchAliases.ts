import type { D1DatabaseLike } from "../../utils/cloudflareBindings";
import { normalizeSearchText } from "../../../utils/sourceContent";
import { searchTitleCore } from "../utils/searchAliases";

const ALIAS_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1_000;
const EMPTY_ALIAS_CACHE_TTL_MS = 30 * 60 * 1_000;
const LOOKUP_TIMEOUT_MS = 1_500;

interface AliasCacheRow {
  aliases_json: string;
  updated_at: number;
}

interface DoubanSearchItem {
  target?: {
    id?: string | number;
    title?: string;
  };
}

interface DoubanSearchPayload {
  subjects?: {
    items?: DoubanSearchItem[];
  };
}

interface DoubanSubjectPayload {
  title?: string;
  original_title?: string;
  aka?: string[];
}

function queryKey(value: string): string {
  return normalizeSearchText(searchTitleCore(value)).slice(0, 116);
}

function uniqueAliases(values: unknown[], original: string): string[] {
  const normalizedOriginal = normalizeSearchText(original);
  const aliases: string[] = [];
  for (const value of values) {
    const alias = String(value || "").normalize("NFKC").trim();
    if (
      !alias ||
      alias.length > 80 ||
      normalizeSearchText(alias) === normalizedOriginal ||
      aliases.some(
        (current) => normalizeSearchText(current) === normalizeSearchText(alias)
      )
    ) {
      continue;
    }
    aliases.push(alias);
  }
  return aliases
    .sort((left, right) => {
      const leftLatin = /^[\x00-\x7F]+$/.test(left) ? 1 : 0;
      const rightLatin = /^[\x00-\x7F]+$/.test(right) ? 1 : 0;
      return rightLatin - leftLatin;
    })
    .slice(0, 3);
}

async function fetchJsonWithTimeout<T>(
  input: string,
  signal?: AbortSignal
): Promise<T | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  const mergedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
  try {
    const response = await fetch(input, {
      headers: {
        accept: "application/json",
        referer: "https://m.douban.com/",
        "user-agent": "Mozilla/5.0",
      },
      signal: mergedSignal,
    });
    if (!response.ok) return undefined;
    return (await response.json()) as T;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function readAliasCache(
  database: D1DatabaseLike | undefined,
  key: string,
  now: number
): Promise<string[] | undefined> {
  if (!database || !key) return undefined;
  const row = await database
    .prepare(
      `SELECT aliases_json, updated_at
       FROM search_alias_cache WHERE query_key = ?`
    )
    .bind(key)
    .first<AliasCacheRow>()
    .catch(() => null);
  if (!row) {
    return undefined;
  }
  try {
    const aliases = JSON.parse(row.aliases_json);
    if (!Array.isArray(aliases)) return undefined;
    const normalizedAliases = aliases.map(String).filter(Boolean).slice(0, 3);
    const maxAge = normalizedAliases.length
      ? ALIAS_CACHE_TTL_MS
      : EMPTY_ALIAS_CACHE_TTL_MS;
    if (now - Number(row.updated_at || 0) > maxAge) return undefined;
    return normalizedAliases;
  } catch {
    return undefined;
  }
}

async function writeAliasCache(
  database: D1DatabaseLike | undefined,
  key: string,
  query: string,
  aliases: string[],
  now: number
): Promise<void> {
  if (!database || !key) return;
  await database
    .prepare(
      `INSERT INTO search_alias_cache
         (query_key, query, aliases_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(query_key) DO UPDATE SET
         query = excluded.query,
         aliases_json = excluded.aliases_json,
         updated_at = excluded.updated_at`
    )
    .bind(key, query.slice(0, 120), JSON.stringify(aliases), now)
    .run()
    .catch(() => undefined);
}

export async function resolveMovieSearchAliases(
  keyword: string,
  database?: D1DatabaseLike,
  signal?: AbortSignal,
  now = Date.now()
): Promise<string[]> {
  const core = searchTitleCore(keyword);
  const key = queryKey(core);
  const cacheKey = `v2:${key}`;
  if (
    !key ||
    core.length < 2 ||
    core.length > 40 ||
    !/[\u3400-\u9fff]/u.test(core)
  ) {
    return [];
  }

  const cached = await readAliasCache(database, cacheKey, now);
  if (cached) return cached;

  const searchUrl = new URL("https://m.douban.com/rexxar/api/v2/search");
  searchUrl.searchParams.set("q", core);
  searchUrl.searchParams.set("type", "movie");
  searchUrl.searchParams.set("start", "0");
  searchUrl.searchParams.set("count", "5");
  const search = await fetchJsonWithTimeout<DoubanSearchPayload>(
    searchUrl.href,
    signal
  );
  const candidates = search?.subjects?.items || [];
  const subject = candidates.find((item) => {
    const title = String(item.target?.title || "");
    const normalized = normalizeSearchText(title);
    return normalized === key || normalized.includes(key) || key.includes(normalized);
  });
  const id = String(subject?.target?.id || "").trim();
  if (!id) {
    await writeAliasCache(database, cacheKey, core, [], now);
    return [];
  }

  const detail = await fetchJsonWithTimeout<DoubanSubjectPayload>(
    `https://m.douban.com/rexxar/api/v2/subject/${encodeURIComponent(id)}`,
    signal
  );
  const aliases = uniqueAliases(
    [detail?.original_title, ...(detail?.aka || [])],
    core
  );
  await writeAliasCache(database, cacheKey, core, aliases, now);
  return aliases;
}
