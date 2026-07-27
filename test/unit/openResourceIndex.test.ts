import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OpenResourceIndexPlugin,
  parseOpenResourcePayload,
} from "../../server/core/plugins/openResourceIndex";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenResourceIndexPlugin", () => {
  it("keeps matching supported links, including 115, and deduplicates them", () => {
    const results = parseOpenResourcePayload(
      {
        code: 200,
        data: [
          {
            name: "三体 电视剧",
            link: "https://115cdn.com/s/share115?password=8888",
            time: "2026-06-25 14:20:28",
          },
          {
            name: "三体 电视剧 重复项",
            link: "https://115cdn.com/s/share115?password=8888",
          },
          {
            name: "三体 4K",
            link: "https://pan.quark.cn/s/sharequark",
          },
          { name: "无关电影", link: "https://pan.quark.cn/s/unrelated" },
          { name: "三体 广告", link: "https://example.com/ad" },
        ],
      },
      "三体"
    );

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      title: "三体 电视剧",
      datetime: "2026-06-25 14:20:28",
      source: "开放资源索引",
      links: [
        {
          type: "115",
          url: "https://115cdn.com/s/share115?password=8888",
          password: "8888",
        },
      ],
    });
    expect(results[1].links[0]).toMatchObject({ type: "quark" });
  });

  it("queries the public script endpoint once without keyword variants", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        code: 200,
        data: [
          { name: "三体 4K", link: "https://pan.quark.cn/s/abc123" },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const plugin = new OpenResourceIndexPlugin();
    await expect(plugin.search("  三体  ")).resolves.toHaveLength(1);

    expect(plugin.timeoutMs()).toBe(2600);
    expect(plugin.useKeywordVariants()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://feapi.xyz/api/sing.php?query=%E4%B8%89%E4%BD%93"
    );
  });
});
