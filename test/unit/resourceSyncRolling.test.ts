import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isSitemapSyncDue,
  orderSitemapPages,
  selectApiPageNumbers,
  selectIndexedSitemapPages,
  syncApiPageSource,
  syncRollingSource,
} from "../../cloudflare/resource-sync/src/index";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rolling resource synchronization", () => {
  it("always refreshes API head pages and advances a bounded backfill cursor", () => {
    expect(
      selectApiPageNumbers(
        { headPages: 2, backfillPages: 3 },
        "",
        100
      )
    ).toEqual({ pages: [1, 2, 3, 4, 5], nextCursorPage: 6 });

    expect(
      selectApiPageNumbers(
        { headPages: 2, backfillPages: 3 },
        JSON.stringify({ cursorPage: 99 }),
        100
      )
    ).toEqual({ pages: [1, 2, 99, 100, 3], nextCursorPage: 4 });
  });

  it("syncs five public API pages without pruning historical source rows", async () => {
    const queries: Array<{ sql: string; values: unknown[] }> = [];
    const createStatement = (sql: string) => {
      const entry = { sql, values: [] as unknown[] };
      queries.push(entry);
      return {
        bind(...values: unknown[]) {
          entry.values = values;
          return this;
        },
        async first() {
          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          return { success: true };
        },
      };
    };
    const database = {
      prepare: createStatement,
      async batch() {
        return [];
      },
    };
    const fetchMock = vi.fn().mockImplementation((input: string | URL) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      return Promise.resolve(
        Response.json({
          success: true,
          code: 200,
          data: {
            page,
            page_size: 100,
            total: 10_000,
            data: [
              {
                title: `第 ${page} 页资源`,
                url: `https://pan.quark.cn/s/page${page}`,
                updated_at: "2026-07-23 03:13:21",
              },
            ],
          },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await syncApiPageSource(
      {
        key: "rolling-test",
        label: "测试增量库",
        category: "综合资源",
        endpoint: "https://source.test/api/resources",
        pageSize: 100,
        headPages: 2,
        backfillPages: 3,
        minimumIntervalMs: 60 * 60 * 1_000,
      },
      { RESOURCE_DB: database } as any
    );

    expect(result).toMatchObject({
      status: "success",
      itemCount: 5,
      scannedPages: [1, 2, 3, 4, 5],
      nextCursorPage: 6,
      totalPages: 100,
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(
      queries.some((entry) => entry.sql.includes("sync_revision <> ?"))
    ).toBe(false);
  });

  it("reads append-only sitemap pages from the newest end", () => {
    const pages = ["old-1", "middle-2", "new-3"];
    expect(orderSitemapPages(pages, true)).toEqual([
      "new-3",
      "middle-2",
      "old-1",
    ]);
    expect(pages).toEqual(["old-1", "middle-2", "new-3"]);
  });

  it("throttles successful heavy sources while allowing failed retries", () => {
    const now = Date.now();
    expect(
      isSitemapSyncDue(
        60 * 60 * 1_000,
        { status: "success", finishedAt: now - 10 * 60 * 1_000 },
        now
      )
    ).toBe(false);
    expect(
      isSitemapSyncDue(
        60 * 60 * 1_000,
        { status: "error", finishedAt: now - 10 * 60 * 1_000 },
        now
      )
    ).toBe(true);
    expect(
      isSitemapSyncDue(
        60 * 60 * 1_000,
        { status: "success", finishedAt: now - 61 * 60 * 1_000 },
        now
      )
    ).toBe(true);
  });

  it("refreshes the newest sitemap while advancing an older backfill cursor", () => {
    const sitemaps = ["https://source.test/new.xml", "https://source.test/old.xml"];
    const pages = new Map([
      [sitemaps[0], ["new-1", "new-2", "new-3"]],
      [sitemaps[1], ["old-1", "old-2", "old-3"]],
    ]);

    const selection = selectIndexedSitemapPages(
      sitemaps,
      pages,
      JSON.stringify({ sitemap: sitemaps[1], offset: 1 }),
      2,
      2
    );

    expect(selection.urls).toEqual(["new-1", "new-2", "old-2", "old-3"]);
    expect(selection.nextSitemap).toBe(sitemaps[1]);
    expect(selection.nextOffset).toBe(3);
  });

  it("keeps feed history and only expires source rows older than 30 days", async () => {
    const queries: Array<{ sql: string; values: unknown[] }> = [];
    const createStatement = (sql: string) => {
      const entry = { sql, values: [] as unknown[] };
      queries.push(entry);
      return {
        bind(...values: unknown[]) {
          entry.values = values;
          return this;
        },
        async first() {
          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          return { success: true };
        },
      };
    };
    const database = {
      prepare: createStatement,
      async batch() {
        return [];
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          code: 200,
          time: 1784746458,
          Data: [
            {
              ScrName: "三体 4K",
              Scrurl: "https://pan.quark.cn/s/abc123",
              Scrpass: "",
            },
          ],
        })
      )
    );

    const result = await syncRollingSource({ RESOURCE_DB: database } as any);
    const sql = queries.map((entry) => entry.sql).join("\n");

    expect(result).toMatchObject({ status: "success", itemCount: 1 });
    expect(sql).toContain("updated_at < ?");
    expect(sql).toContain("NOT EXISTS");
    expect(sql).not.toContain("sync_revision <> ?");

    const expiry = queries.find((entry) => entry.sql.includes("updated_at < ?"));
    expect(expiry?.values[0]).toBe("rolling-01");
    expect(Number(expiry?.values[1])).toBeLessThan(Date.now() - 29 * 24 * 60 * 60 * 1000);
  });
});
