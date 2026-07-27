import { beforeEach, describe, expect, it, vi } from "vitest";

const { ofetchMock } = vi.hoisted(() => ({ ofetchMock: vi.fn() }));

vi.mock("ofetch", () => ({
  ofetch: ofetchMock,
}));

import { SolidTorrentsPlugin } from "../../server/core/plugins/solidtorrents";

describe("SolidTorrentsPlugin", () => {
  beforeEach(() => {
    ofetchMock.mockReset();
  });

  it("builds a magnet from infohash and keeps API metadata", async () => {
    ofetchMock.mockResolvedValueOnce({
      results: [{
        id: "ubuntu-2404",
        infohash: "611F70899D4E1D6A9C39CFC925F103DFEF630328",
        title: "ubuntu-24.04.2-desktop-amd64.iso",
        size: 6_343_219_200,
        seeders: 165,
        leechers: 31,
        verified: true,
        updatedAt: "2026-07-22T03:45:35.538Z",
      }],
    });

    const results = await new SolidTorrentsPlugin().search("ubuntu");

    expect(results).toHaveLength(1);
    expect(results[0]?.links[0]?.url).toContain(
      "magnet:?xt=urn:btih:611F70899D4E1D6A9C39CFC925F103DFEF630328"
    );
    expect(results[0]?.metadata).toMatchObject({
      sizeBytes: 6_343_219_200,
      seeders: 165,
      leechers: 31,
      verified: true,
      fileType: "ISO",
      infoHash: "611f70899d4e1d6a9c39cfc925f103dfef630328",
      lastSeenAt: "2026-07-22T03:45:35.538Z",
      availabilityStatus: "active",
      sources: ["BitSearch"],
    });
    expect(results[0]?.datetime).toBe("");
  });

  it("parses the JSON body returned by the readonly proxy fallback", async () => {
    ofetchMock
      .mockRejectedValueOnce(new Error("primary unavailable"))
      .mockRejectedValueOnce(new Error("fallback unavailable"))
      .mockResolvedValueOnce(`Title:\n\nMarkdown Content:\n${JSON.stringify({
        success: true,
        results: [{
          id: "fallback-1",
          infohash: "443C7602B4FDE83D1154D6D9DA48808418B181B6",
          title: "Ubuntu 1080P demo.mkv",
          size: 2_000_000_000,
          seeders: 21,
        }],
      })}`);

    const results = await new SolidTorrentsPlugin().search("ubuntu");

    expect(results).toHaveLength(1);
    expect(results[0]?.metadata).toMatchObject({
      resolution: "1080P",
      fileType: "MKV",
      seeders: 21,
    });
  });

  it("queries a compact catalog variant in parallel and deduplicates hashes", async () => {
    ofetchMock.mockImplementation(async (url: string) => {
      if (url.includes("q=OFES033")) {
        return {
          results: [
            {
              id: "variant-duplicate",
              infohash: "a".repeat(40),
              title: "OFES033 duplicate",
            },
            {
              id: "variant-extra",
              infohash: "b".repeat(40),
              title: "soaap.cc@OFES033",
              seeders: 4,
            },
          ],
        };
      }
      return {
        results: [{
          id: "primary",
          infohash: "a".repeat(40),
          title: "OFES-033",
          seeders: 20,
        }],
      };
    });

    const results = await new SolidTorrentsPlugin().search("OFES-033");

    expect(ofetchMock).toHaveBeenCalledTimes(3);
    expect(ofetchMock.mock.calls.map(([url]) => String(url))).toEqual(
      expect.arrayContaining([
        expect.stringContaining("q=OFES-033"),
        expect.stringContaining("q=OFES033"),
      ])
    );
    expect(results).toHaveLength(2);
    expect(results.map((result) => result.metadata?.infoHash)).toEqual([
      "a".repeat(40),
      "b".repeat(40),
    ]);
  });
});
