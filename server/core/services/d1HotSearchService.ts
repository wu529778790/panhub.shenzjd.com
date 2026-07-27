import type { HotSearchItem, HotSearchStats } from "./hotSearchStore";
import type { D1DatabaseLike } from "../../utils/cloudflareBindings";

const HOT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_QUERY_ROWS = 100;

interface D1HotSearchRow {
  term: string;
  score: number;
  last_searched_at: number;
  created_at: number;
}

export function normalizeD1HotSearchTerm(term: string): string | undefined {
  let normalized = term.trim();
  if (!normalized || /^https?:\/\//i.test(normalized) || normalized.length > 20) {
    return undefined;
  }
  normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0xfee0)
  );
  if (/政治|暴力|色情|赌博|毒品|fuck|shit|bitch/i.test(normalized)) {
    return undefined;
  }
  return normalized;
}

export function rankD1HotSearchRows(
  rows: D1HotSearchRow[],
  limit: number,
  now = Date.now()
): HotSearchItem[] {
  const cutoff = now - HOT_WINDOW_MS;
  return rows
    .filter((row) => Number(row.last_searched_at) >= cutoff)
    .map((row) => {
      const ageDays = Math.max(0, now - Number(row.last_searched_at)) / 86_400_000;
      return {
        term: row.term,
        score: Number(row.score) || 0,
        lastSearched: Number(row.last_searched_at) || 0,
        createdAt: Number(row.created_at) || 0,
        displayScore: Math.round((Number(row.score) || 0) * Math.exp(-0.05 * ageDays) * 100) / 100,
      };
    })
    .sort((a, b) =>
      (b.displayScore ?? b.score) - (a.displayScore ?? a.score) ||
      b.lastSearched - a.lastSearched
    )
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export async function recordD1HotSearch(
  database: D1DatabaseLike,
  term: string,
  now = Date.now()
): Promise<void> {
  const normalized = normalizeD1HotSearchTerm(term);
  if (!normalized) return;

  await database
    .prepare(
      `INSERT INTO hot_searches (term, score, last_searched_at, created_at)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(term) DO UPDATE SET
         score = hot_searches.score + 1,
         last_searched_at = excluded.last_searched_at`
    )
    .bind(normalized, now, now)
    .run();
}

export async function getD1HotSearches(
  database: D1DatabaseLike,
  limit: number,
  now = Date.now()
): Promise<HotSearchItem[]> {
  const response = await database
    .prepare(
      `SELECT term, score, last_searched_at, created_at
       FROM hot_searches
       WHERE last_searched_at >= ?
       ORDER BY score DESC, last_searched_at DESC
       LIMIT ?`
    )
    .bind(now - HOT_WINDOW_MS, MAX_QUERY_ROWS)
    .all<D1HotSearchRow>();

  return rankD1HotSearchRows(response.results || [], limit, now);
}

export async function getD1HotSearchStats(
  database: D1DatabaseLike
): Promise<HotSearchStats> {
  const count = await database
    .prepare("SELECT COUNT(*) AS total FROM hot_searches")
    .first<{ total: number }>();
  return {
    total: Number(count?.total) || 0,
    topTerms: await getD1HotSearches(database, 10),
  };
}
