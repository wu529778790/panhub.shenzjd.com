import { describe, expect, it } from "vitest";
import {
  enrichTorrentMetadata,
  formatTorrentSize,
  isAdultContent,
  mergeTorrentMetadata,
  normalizeMagnetKey,
  parseTorrentSize,
  scoreTorrentResult,
  torrentDisplayTags,
} from "../../utils/torrentMetadata";

describe("torrent metadata helpers", () => {
  it("parses decimal and binary size units", () => {
    expect(parseTorrentSize("1.5 GB")).toBe(1_500_000_000);
    expect(parseTorrentSize("624.0 MiB")).toBe(654_311_424);
    expect(formatTorrentSize(6_343_219_200)).toBe("6.34 GB");
  });

  it("extracts release dimensions from a torrent title", () => {
    const metadata = enrichTorrentMetadata(
      "示例剧 S02E03 2025 2160p BluRay REMUX HEVC HDR10+ Atmos 国语中字.mkv"
    );

    expect(metadata).toMatchObject({
      resolution: "4K",
      releaseType: "REMUX",
      videoCodec: "H.265",
      hdr: "HDR10+",
      audio: "Atmos",
      seasonEpisode: "S02E03",
      fileType: "MKV",
      year: 2025,
    });
    expect(metadata.languages).toEqual(["国语", "中字"]);
    expect(torrentDisplayTags(metadata)).toEqual([
      "4K",
      "REMUX",
      "H.265",
      "HDR10+",
      "Atmos",
    ]);
  });

  it("classifies explicit adult titles without hiding ordinary education content", () => {
    expect(isAdultContent("XXX无码成人影片 1080P.mp4")).toBe(true);
    expect(isAdultContent("OnlyFans uncensored collection")).toBe(true);
    expect(isAdultContent("Threesome intense body licking")).toBe(true);
    expect(isAdultContent("痴女巨乳ハメまくり")).toBe(true);
    expect(isAdultContent("SNIS-886")).toBe(true);
    expect(isAdultContent("成人高考数学课程")).toBe(false);
    expect(isAdultContent("人体解剖学教程")).toBe(false);
    expect(enrichTorrentMetadata("R18 無修正作品")).toMatchObject({ adult: true });
    expect(enrichTorrentMetadata("release 1080p", "", { category: "XXX" }))
      .toMatchObject({ adult: true, category: "XXX" });
  });

  it("merges the strongest activity data and all source names", () => {
    const merged = mergeTorrentMetadata(
      { seeders: 12, leechers: 4, sources: ["Nyaa"], resolution: "1080P" },
      { seeders: 29, leechers: 2, sources: ["BitSearch"], sizeBytes: 2_500_000_000 }
    );

    expect(merged).toMatchObject({
      seeders: 29,
      leechers: 4,
      resolution: "1080P",
      sizeBytes: 2_500_000_000,
      sources: ["Nyaa", "BitSearch"],
    });
  });

  it("uses the newest sampled swarm data instead of a stale historical maximum", () => {
    const merged = mergeTorrentMetadata(
      {
        seeders: 900,
        leechers: 40,
        metadataCheckedAt: "2026-07-20T00:00:00.000Z",
      },
      {
        seeders: 8,
        leechers: 2,
        metadataCheckedAt: "2026-07-22T00:00:00.000Z",
      }
    );
    expect(merged).toMatchObject({ seeders: 8, leechers: 2 });
  });

  it("preserves the adult classification while merging torrent sources", () => {
    expect(mergeTorrentMetadata(
      { adult: true, sources: ["BitSearch"] },
      { seeders: 12, sources: ["Knaben"] }
    )).toMatchObject({ adult: true, seeders: 12 });
  });

  it("normalizes magnets by BTIH and ranks more relevant active results first", () => {
    const hash = "582FC386D0087DCEFE998B70D0BC6794C361E603";
    expect(normalizeMagnetKey(`magnet:?dn=demo&xt=urn:btih:${hash}`)).toBe(
      `magnet:${hash.toLowerCase()}`
    );
    expect(
      normalizeMagnetKey(
        "magnet:?xt=urn:btih:LAX4HBWQBB6457UZRNYNBPDHSTBWDZQD"
      )
    ).toBe(`magnet:${hash.toLowerCase()}`);

    const exact = scoreTorrentResult(
      { title: "Ubuntu 24.04 ISO", metadata: { seeders: 40, verified: true } },
      "Ubuntu 24.04"
    );
    const unrelated = scoreTorrentResult(
      { title: "Linux collection", metadata: { seeders: 2 } },
      "Ubuntu 24.04"
    );
    expect(exact).toBeGreaterThan(unrelated);
  });
});
