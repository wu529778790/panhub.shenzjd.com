import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MediaDiscoveryPlugin,
  parseEztvResponse,
  parseMediaDetailPage,
  parseMediaSearchCandidates,
} from "../../server/core/plugins/mediaDiscovery";

const SEARCH_HTML = `
  <ul id="post_container">
    <li class="post">
      <div class="article"><h2><a href="/dianshiju/rihanju/29067.html">金特务：本色回归</a></h2></div>
      <span class="info_date">2026-07-20</span>
    </li>
    <li class="post">
      <div class="article"><h2><a href="/juqingpian/1.html">无关电影</a></h2></div>
    </li>
  </ul>`;

const DIRECT_HASH = "f69ee6149ca68de2fef79e936a7ec15d7eb147b5";
const EZTV_HASH = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DETAIL_HTML = `
  <header><h1>新版6v电影（旧版66影视）- 免费电影下载</h1></header>
  <div class="article_container">
    <h1>金特务：本色回归</h1>
    <div id="post_content">
      <p>◎IMDb链接 tt42127457</p>
      <a href="magnet:?xt=urn:btih:${DIRECT_HASH}&dn=Agent.Kim.S01E01.%E7%94%B5%E5%BD%B1%E6%B8%AF&tr=udp%3A%2F%2Ftracker.example%3A80">01.1080p.HD中字.mp4</a>
      <a href="https://pan.baidu.com/s/baidu?pwd=dyg7">百度网盘</a>
      <a href="https://pan.quark.cn/s/quark">夸克网盘</a>
      <a href="https://pan.xunlei.com/s/xunlei?pwd=5i8t">迅雷云盘</a>
    </div>
  </div>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("media discovery parsers", () => {
  it("keeps only strict 6v search candidates", () => {
    expect(parseMediaSearchCandidates(SEARCH_HTML, "金特务")).toEqual([
      {
        id: "29067",
        title: "金特务：本色回归",
        detailUrl: "https://www.6vdy.org/dianshiju/rihanju/29067.html",
        datetime: "2026-07-20",
      },
    ]);
  });

  it("extracts cloud links, direct magnets and IMDb IDs", () => {
    const detail = parseMediaDetailPage(DETAIL_HTML);
    expect(detail).toMatchObject({
      title: "金特务：本色回归",
      imdbId: "tt42127457",
      cloudLinks: [
        { type: "baidu", url: "https://pan.baidu.com/s/baidu?pwd=dyg7", password: "dyg7" },
        { type: "quark", url: "https://pan.quark.cn/s/quark", password: "" },
        { type: "xunlei", url: "https://pan.xunlei.com/s/xunlei?pwd=5i8t", password: "5i8t" },
      ],
    });
    expect(detail.magnets).toHaveLength(1);
    expect(detail.magnets[0]).toMatchObject({
      title: "01.1080p.HD中字.mp4",
      source: "电影港",
      metadata: {
        infoHash: DIRECT_HASH,
        resolution: "1080P",
        trackerCount: 1,
      },
    });
  });

  it("normalizes EZTV swarm metadata and falls back to a hash magnet", () => {
    const results = parseEztvResponse({
      torrents: [
        {
          title: "Agent Kim S01E01 1080p WEB-DL",
          hash: EZTV_HASH,
          seeds: 88,
          peers: 12,
          size_bytes: 2_000_000_000,
          date_released_unix: 1_784_505_600,
        },
      ],
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      source: "EZTV",
      url: `magnet:?xt=urn:btih:${EZTV_HASH}&dn=Agent%20Kim%20S01E01%201080p%20WEB-DL`,
      metadata: {
        infoHash: EZTV_HASH,
        sizeBytes: 2_000_000_000,
        size: "2.00 GB",
        seeders: 88,
        leechers: 12,
        resolution: "1080P",
        releaseType: "WEB-DL",
      },
    });
  });
});

describe("MediaDiscoveryPlugin", () => {
  it("combines 6v cloud/magnets with EZTV data without using the protected target API", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response("", {
          status: 302,
          headers: { location: "result/?searchid=62370" },
        })
      )
      .mockResolvedValueOnce(new Response(SEARCH_HTML, { status: 200 }))
      .mockResolvedValueOnce(new Response(DETAIL_HTML, { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({
          torrents: [
            {
              title: "Agent Kim S01E01 1080p WEB-DL",
              hash: EZTV_HASH,
              magnet_url: `magnet:?xt=urn:btih:${EZTV_HASH}&dn=Agent.Kim.S01E01`,
              seeds: 42,
              peers: 7,
              size_bytes: 1_500_000_000,
              date_released_unix: 1_784_505_600,
            },
          ],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const results = await new MediaDiscoveryPlugin().search("金特务");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "https://www.6vdy.org/e/search/11index.php",
      "https://www.6vdy.org/e/search/result/?searchid=62370",
      "https://www.6vdy.org/dianshiju/rihanju/29067.html",
      "https://eztvx.to/api/get-torrents?limit=30&imdb_id=42127457",
    ]);
    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({
      title: "金特务：本色回归",
      source: "6v电影",
      links: expect.arrayContaining([
        { type: "baidu", url: "https://pan.baidu.com/s/baidu?pwd=dyg7", password: "dyg7" },
        { type: "quark", url: "https://pan.quark.cn/s/quark", password: "" },
      ]),
    });
    expect(results[1]).toMatchObject({
      source: "电影港",
      links: [{ type: "magnet", url: expect.stringContaining(DIRECT_HASH), password: "" }],
    });
    expect(results[2]).toMatchObject({
      title: "金特务：本色回归 · Agent Kim S01E01 1080p WEB-DL",
      source: "EZTV",
      metadata: { seeders: 42, leechers: 7 },
    });
  });
});
