import { describe, expect, it } from "vitest";
import type { SearchResult } from "../../server/core/types/models";
import {
  MAGNET_CACHE_FRESH_MS,
  readMagnetSearchCache,
  writeMagnetSearchCache,
} from "../../server/core/services/magnetSearchCache";

function createDatabase() {
  const rows = new Map<string, { payload_json: string; updated_at: number }>();
  return {
    prepare(sql: string) {
      let values: unknown[] = [];
      const statement = {
        bind(...incoming: unknown[]) {
          values = incoming;
          return statement;
        },
        async first() {
          return rows.get(`${values[0]}:${values[1]}`) || null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          if (/INSERT INTO magnet_search_cache/i.test(sql)) {
            rows.set(`${values[0]}:${values[1]}`, {
              payload_json: String(values[3]),
              updated_at: Number(values[5]),
            });
          }
          return { success: true, meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };
}

const result: SearchResult = {
  message_id: "",
  unique_id: "magnet-a",
  channel: "test",
  datetime: "",
  title: "Ubuntu 24.04",
  content: "",
  links: [
    {
      type: "magnet",
      url: `magnet:?xt=urn:btih:${"a".repeat(40)}`,
      password: "",
    },
  ],
};

describe("magnet search cache", () => {
  it("shares fresh results through D1 and marks old results stale", async () => {
    const database = createDatabase();
    const now = Date.now();
    await writeMagnetSearchCache(
      database,
      "磁力索引",
      " Ubuntu  ",
      [result],
      now
    );

    const fresh = await readMagnetSearchCache(
      database,
      "磁力索引",
      "ubuntu",
      now + 1000
    );
    expect(fresh).toMatchObject({
      fresh: true,
      results: [{ title: "Ubuntu 24.04" }],
    });

    const stale = await readMagnetSearchCache(
      database,
      "磁力索引",
      "ubuntu",
      now + MAGNET_CACHE_FRESH_MS + 1
    );
    expect(stale?.fresh).toBe(false);
    expect(stale?.results).toHaveLength(1);
  });
});
