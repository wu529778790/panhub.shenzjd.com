import { describe, expect, it } from "vitest";
import {
  inspectSeoHtml,
  parseSitemapEntries,
  selectIndexNowUrls,
} from "../../cloudflare/resource-sync/src/seo";

describe("SEO audit", () => {
  it("parses sitemap URLs and lastmod values", () => {
    const entries = parseSitemapEntries(`<?xml version="1.0"?>
      <urlset>
        <url>
          <loc>https://haosouku.com/topic/4k-movie</loc>
          <lastmod>2026-07-22</lastmod>
        </url>
        <url><loc>https://haosouku.com/?a=1&amp;b=2</loc></url>
      </urlset>`);
    expect(entries).toEqual([
      {
        url: "https://haosouku.com/topic/4k-movie",
        lastmod: "2026-07-22",
      },
      { url: "https://haosouku.com/?a=1&b=2", lastmod: "" },
    ]);
  });

  it("accepts a complete indexable page", () => {
    const audit = inspectSeoHtml(
      `<html><head>
        <title>4K 电影搜索方法 - 好搜库</title>
        <meta content="按年份和版本查找 4K 电影资源。" name="description">
        <meta name="robots" content="index,follow">
        <link href="https://haosouku.com/topic/4k-movie" rel="canonical">
        <script type="application/ld+json">{"@type":"CollectionPage"}</script>
      </head><body><h1>4K 电影资源怎么找</h1></body></html>`,
      {
        url: "https://haosouku.com/topic/4k-movie",
        lastmod: "2026-07-22",
      }
    );
    expect(audit.issues).toEqual([]);
    expect(audit.h1Count).toBe(1);
    expect(audit.hasStructuredData).toBe(true);
  });

  it("reports missing and conflicting SEO signals", () => {
    const audit = inspectSeoHtml(
      `<html><head>
        <meta name="robots" content="noindex,nofollow">
        <link rel="canonical" href="https://haosouku.com/other">
      </head><body><h1>A</h1><h1>B</h1></body></html>`,
      { url: "https://haosouku.com/topic/test", lastmod: "" },
      503
    );
    expect(audit.issues).toEqual(
      expect.arrayContaining([
        "http:503",
        "title:missing",
        "description:missing",
        "canonical:mismatch",
        "robots:noindex",
        "h1:2",
        "structured-data:missing",
      ])
    );
  });

  it("backs off failed IndexNow submissions while still sending new URLs", () => {
    const now = Date.UTC(2026, 6, 25, 12);
    const entries = [
      { url: "https://haosouku.com/guide/new", lastmod: "2026-07-25" },
      { url: "https://haosouku.com/guide/recent-failure", lastmod: "2026-07-24" },
      { url: "https://haosouku.com/guide/old-failure", lastmod: "2026-07-23" },
      { url: "https://haosouku.com/guide/indexed", lastmod: "2026-07-22" },
    ];
    const states = [
      {
        url: entries[1].url,
        lastmod: entries[1].lastmod,
        last_audited_at: now,
        last_submitted_at: now - 6 * 60 * 60 * 1_000,
        indexnow_status: 429,
      },
      {
        url: entries[2].url,
        lastmod: entries[2].lastmod,
        last_audited_at: now,
        last_submitted_at: now - 72 * 60 * 60 * 1_000,
        indexnow_status: 429,
      },
      {
        url: entries[3].url,
        lastmod: entries[3].lastmod,
        last_audited_at: now,
        last_submitted_at: now - 72 * 60 * 60 * 1_000,
        indexnow_status: 200,
      },
    ];
    expect(selectIndexNowUrls(entries, states, now)).toEqual([
      entries[0].url,
      entries[2].url,
    ]);
  });
});
