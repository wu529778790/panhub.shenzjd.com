import { afterEach, describe, expect, it, vi } from "vitest";
import { MagnetIndexPlugin } from "../../server/core/plugins/magnetIndex";

describe("MagnetIndexPlugin", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("queries four public indexes without hiding adult categories and merges duplicate hashes", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("knaben.org")) {
        const body = JSON.parse(String(init?.body || "{}"));
        expect(body).toMatchObject({ hide_unsafe: false, hide_xxx: false });
        return Response.json({
          hits: [
            {
              hash: "a".repeat(40),
              title: "三体 XXX 无码版",
              category: "XXX",
              seeders: 9,
              peers: 3,
              bytes: 1_000_000,
              cachedOrigin: "LimeTorrents",
            },
            {
              hash: "c".repeat(40),
              title: "三体 冷门版本",
              category: "Video",
              seeders: 0,
            },
            {
              hash: "d".repeat(40),
              title: "银河帝国",
              seeders: 22,
            },
          ],
        });
      }
      if (url.includes("apibay.org")) {
        return Response.json([
          {
            id: "1",
            name: "三体 XXX 无码版",
            info_hash: "a".repeat(40),
            seeders: "20",
            leechers: "5",
            size: "2000000",
            status: "vip",
          },
          {
            id: "2",
            name: "三体 4K",
            info_hash: "b".repeat(40),
            seeders: "15",
            size: "3000000",
          },
        ]);
      }
      if (url.includes("torrentdownloads.pro")) {
        expect(url).toContain(`search=${encodeURIComponent("三体")}`);
        return new Response(`<?xml version="1.0"?>
          <rss><channel><item>
            <title><![CDATA[三体 RSS 版]]></title>
            <pubDate>Wed, 22 Jul 2026 11:10:57 +0200</pubDate>
            <category><![CDATA[Video]]></category>
            <size>2200000</size>
            <seeders>18</seeders>
            <leechers>4</leechers>
            <info_hash>${"a".repeat(40)}</info_hash>
          </item></channel></rss>`, {
          headers: { "content-type": "application/rss+xml" },
        });
      }
      return Response.json({
        torrents: [
          {
            id: 3,
            name: "三体 XXX 无码版",
            infohash: "a".repeat(40),
            seeders: 12,
            size_bytes: 2_500_000,
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await new MagnetIndexPlugin().search("三体");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(results).toHaveLength(3);
    const unrestricted = results.find(
      (result) => result.metadata?.infoHash === "a".repeat(40)
    );
    expect(unrestricted?.title).toContain("XXX");
    expect(unrestricted?.metadata).toMatchObject({
      seeders: 20,
      sizeBytes: 2_500_000,
      verified: true,
      sources: [
        "Knaben",
        "LimeTorrents",
        "The Pirate Bay",
        "Torrents-CSV",
        "TorrentDownloads",
      ],
    });
    expect(
      results.find((result) => result.metadata?.infoHash === "c".repeat(40))
        ?.metadata?.seeders
    ).toBe(0);
    expect(results.some((result) => result.title === "银河帝国")).toBe(false);
  });
});
