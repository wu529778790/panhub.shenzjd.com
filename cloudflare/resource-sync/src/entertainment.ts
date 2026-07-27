import { fetchLatestEntertainment } from "../../../server/core/services/entertainmentLatestService";

interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  run(): Promise<unknown>;
}

interface D1DatabaseLike {
  prepare(query: string): D1StatementLike;
}

export interface EntertainmentSyncEnv {
  RESOURCE_DB: D1DatabaseLike;
}

export async function syncEntertainmentLatest(
  env: EntertainmentSyncEnv
): Promise<{
  status: "success";
  movieCount: number;
  tvCount: number;
  collectionCount: number;
  updatedAt: number;
}> {
  const data = await fetchLatestEntertainment(12);
  await env.RESOURCE_DB
    .prepare(
      `INSERT INTO entertainment_latest_cache (cache_key, payload_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         updated_at = excluded.updated_at`
    )
    .bind(
      "homepage",
      JSON.stringify({
        movies: data.movies,
        tv: data.tv,
        collections: data.collections,
      }),
      data.updatedAt
    )
    .run();

  return {
    status: "success",
    movieCount: data.movies.length,
    tvCount: data.tv.length,
    collectionCount: data.collections.length,
    updatedAt: data.updatedAt,
  };
}
