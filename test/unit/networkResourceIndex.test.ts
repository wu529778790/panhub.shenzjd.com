import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NetworkResourceIndexPlugin,
  parseNetworkResourcePayload,
} from "../../server/core/plugins/networkResourceIndex";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NetworkResourceIndexPlugin", () => {
  it("classifies links from their URLs and extracts embedded PikPak magnets", () => {
    const results = parseNetworkResourcePayload(
      [
        {
          taskname: "📺 电视剧：三体 (2023)",
          shareurl: "https://115cdn.com/s/share115?password=8888",
          type: "quark",
        },
        {
          taskname: "资源名称：三体 / Three-Body",
          shareurl:
            "https://toapp.mypikpak.com/toapp?__add_url=magnet:?xt=urn:btih:D78E8EEC4BA2EFBA2A08E1759EA0DE8839E8D5AC&amp;source=pptg",
          type: "baidu",
        },
        {
          taskname: "我的三体",
          shareurl: "https://123pan.cn/s/example?pwd=xoxo",
          type: "unknown",
        },
        {
          taskname: "无关电影",
          shareurl: "https://pan.quark.cn/s/unrelated",
        },
      ],
      "三体"
    );

    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({
      source: "网络资源索引",
      links: [
        {
          type: "115",
          url: "https://115cdn.com/s/share115?password=8888",
          password: "8888",
        },
      ],
    });
    expect(results[1].links.map((link) => link.type)).toEqual([
      "pikpak",
      "magnet",
    ]);
    expect(results[1].links[1]?.url).toBe(
      "magnet:?xt=urn:btih:D78E8EEC4BA2EFBA2A08E1759EA0DE8839E8D5AC"
    );
    expect(results[2].links[0]).toMatchObject({
      type: "123",
      password: "xoxo",
    });
  });

  it("honors requested cloud types without trusting the upstream type field", () => {
    const results = parseNetworkResourcePayload(
      [
        {
          taskname: "三体 电视剧",
          shareurl: "https://115.com/s/share115?password=1234",
          type: "quark",
        },
        {
          taskname: "三体 4K",
          shareurl: "https://pan.quark.cn/s/sharequark",
          type: "cloud115",
        },
      ],
      "三体",
      { __cloud_types: ["115"] }
    );

    expect(results).toHaveLength(1);
    expect(results[0].links[0]?.type).toBe("115");
  });

  it("uses one public API request and a tight source budget", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json([
        {
          taskname: "三体 4K",
          shareurl: "https://pan.quark.cn/s/abc123",
        },
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const plugin = new NetworkResourceIndexPlugin();
    await expect(plugin.search("  三体  ")).resolves.toHaveLength(1);

    expect(plugin.timeoutMs()).toBe(1600);
    expect(plugin.useKeywordVariants()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://pansearch.123cf.top/task_suggestions?q=%E4%B8%89%E4%BD%93&d=0"
    );
  });
});
