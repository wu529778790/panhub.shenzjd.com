import { beforeEach, describe, expect, it, vi } from "vitest";

const { ofetchMock } = vi.hoisted(() => ({ ofetchMock: vi.fn() }));

vi.mock("ofetch", () => ({
  ofetch: ofetchMock,
}));

import { NyaaPlugin } from "../../server/core/plugins/nyaa";

const NYAA_RSS = `
<rss><channel><item>
  <title>Demo S02E03 1080p HEVC.mkv</title>
  <guid>https://nyaa.si/view/123</guid>
  <pubDate>Thu, 01 Jan 2026 00:00:00 +0000</pubDate>
  <nyaa:seeders>84</nyaa:seeders>
  <nyaa:leechers>12</nyaa:leechers>
  <nyaa:downloads>301</nyaa:downloads>
  <nyaa:infoHash>582fc386d0087dcefe998b70d0bc6794c361e603</nyaa:infoHash>
  <nyaa:category>Anime - English-translated</nyaa:category>
  <nyaa:size>2.5 GiB</nyaa:size>
  <nyaa:trusted>Yes</nyaa:trusted>
</item></channel></rss>`;

const SUKEBEI_RSS = `
<rss><channel><item>
  <title>Demo XXX unrestricted release.mkv</title>
  <pubDate>Fri, 02 Jan 2026 00:00:00 +0000</pubDate>
  <nyaa:seeders>0</nyaa:seeders>
  <nyaa:leechers>0</nyaa:leechers>
  <nyaa:downloads>4</nyaa:downloads>
  <nyaa:infoHash>bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb</nyaa:infoHash>
  <nyaa:category>Art - Anime</nyaa:category>
  <nyaa:size>700 MiB</nyaa:size>
  <nyaa:trusted>No</nyaa:trusted>
</item></channel></rss>`;

const ANIMETOSHO_RSS = `
<rss><channel><item>
  <title>Demo S02E03 1080p HEVC.mkv</title>
  <description><![CDATA[
    <strong>Total Size</strong>: 2.5 GiB
    <a href="magnet:?xt=urn:btih:LAX4HBWQBB6457UZRNYNBPDHSTBWDZQD&amp;tr=udp%3A%2F%2Ftracker.example">Magnet</a>
    <a href="https://animetosho.org/view/demo">3 file(s)</a>
  ]]></description>
  <source url="https://nyaa.si/view/123">Nyaa</source>
  <pubDate>Sat, 03 Jan 2026 00:00:00 +0000</pubDate>
</item></channel></rss>`;

describe("NyaaPlugin", () => {
  beforeEach(() => {
    ofetchMock.mockReset();
    ofetchMock.mockImplementation((url: string) => {
      if (url.includes("sukebei")) return Promise.resolve(SUKEBEI_RSS);
      if (url.includes("animetosho")) return Promise.resolve(ANIMETOSHO_RSS);
      return Promise.resolve(NYAA_RSS);
    });
  });

  it("queries all RSS sources, classifies adult content and merges duplicate hashes", async () => {
    const results = await new NyaaPlugin().search("demo");

    expect(ofetchMock).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(2);

    const merged = results.find(
      (result) =>
        result.metadata?.infoHash ===
        "582fc386d0087dcefe998b70d0bc6794c361e603"
    );
    expect(merged?.metadata).toMatchObject({
      sizeBytes: 2_684_354_560,
      seeders: 84,
      leechers: 12,
      completed: 301,
      category: "Anime - English-translated",
      resolution: "1080P",
      videoCodec: "H.265",
      seasonEpisode: "S02E03",
      fileType: "MKV",
      availabilityStatus: "active",
      sources: ["Nyaa", "AnimeTosho"],
    });
    expect(merged?.metadata?.trackerCount).toBe(3);

    const adult = results.find((result) => result.source === "Sukebei");
    expect(adult?.title).toContain("XXX");
    expect(adult?.metadata).toMatchObject({ adult: true, seeders: 0 });
    expect(
      results
        .filter((result) => result.source === "Sukebei")
        .every((result) => result.metadata?.adult === true)
    ).toBe(true);

  });
});
