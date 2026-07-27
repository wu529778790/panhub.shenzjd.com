import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGlobalIndexLink,
  cleanGlobalIndexTitle,
  GlobalIndexPlugin,
  parseGlobalIndexPayload,
} from "../../server/core/plugins/globalIndex";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GlobalIndexPlugin", () => {
  it("sanitizes highlighted titles and maps platform share links", () => {
    expect(cleanGlobalIndexTitle('<span class="highlight">三</span><span>体</span> &amp; 4K'))
      .toBe("三体 & 4K");
    expect(buildGlobalIndexLink("115", "swwfcoe3wrb", "wd29")).toEqual({
      type: "115",
      url: "https://115.com/s/swwfcoe3wrb?password=wd29",
      password: "wd29",
    });
    expect(buildGlobalIndexLink("yidong", "abc123", null)).toEqual({
      type: "mobile",
      url: "https://yun.139.com/shareweb/#/w/i/abc123",
      password: "",
    });
  });

  it("parses every content category and drops only malformed rows", () => {
    const results = parseGlobalIndexPayload({
      success: true,
      data: {
        items: [
          {
            hsid: "safe",
            platform: "quark",
            share_name: '<span class="highlight">教父</span> 4K',
            share_code: "abc123",
            stat_file: 3,
            stat_size: 1073741824,
          },
          {
            hsid: "adult",
            platform: "quark",
            share_name: "成人影片",
            share_code: "blocked",
          },
          { hsid: "unknown", platform: "missing", share_name: "无效", share_code: "x" },
        ],
      },
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      unique_id: "global-index-safe",
      title: "教父 4K",
      content: "3 个文件 · 1.00 GB",
      source: "全网索引",
      links: [{ type: "quark", url: "https://pan.quark.cn/s/abc123" }],
    });
    expect(results[1]).toMatchObject({
      unique_id: "global-index-adult",
      title: "成人影片",
      links: [{ type: "quark", url: "https://pan.quark.cn/s/blocked" }],
    });
  });

  it("searches common and supplemental platforms in parallel", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ success: true, data: { items: [] } })
    );
    vi.stubGlobal("fetch", fetchMock);

    const plugin = new GlobalIndexPlugin();
    await expect(plugin.search("  三体  ")).resolves.toEqual([]);

    expect(plugin.useKeywordVariants()).toBe(false);
    expect(plugin.timeoutMs()).toBe(2800);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const bodies = fetchMock.mock.calls.map((call) =>
      JSON.parse(String((call[1] as RequestInit).body))
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://haisou.cc/api/v2/shares/search"
    );
    expect(bodies.every((body) => body.query === "三体")).toBe(true);
    expect(
      bodies.every(
        (body) =>
          body.pagination.page_size === 20 &&
          body.filters.include_filtered === true
      )
    ).toBe(true);
    expect(bodies[0].filters.platforms).toEqual(
      expect.arrayContaining(["ali", "quark", "xunlei"])
    );
    expect(bodies[1].filters.platforms).toEqual(
      expect.arrayContaining(["115", "123", "ctfile"])
    );
  });

  it("narrows upstream search when a cloud type is requested", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ success: true, data: { items: [] } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await new GlobalIndexPlugin().search("教父", {
      __cloud_types: ["115"],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)
    );
    expect(body.filters.platforms).toEqual(["115"]);
  });
});
