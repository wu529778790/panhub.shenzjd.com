import { describe, expect, it } from "vitest";
import {
  classifyLinkHealth,
  sha256Hex,
} from "../../server/core/services/linkHealthService";
import {
  getLinkPlatform,
  normalizeLinkHealthUrl,
} from "../../utils/linkHealth";
import {
  annotateSearchLinkHealth,
  deprioritizeSuspectSearchLinks,
  removeDeadSearchLinks,
} from "../../server/core/services/searchLinkHealth";

describe("link health helpers", () => {
  it("normalizes supported share URLs without changing case-sensitive ids", () => {
    expect(
      normalizeLinkHealthUrl("https://PAN.QUARK.CN/s/AbC123/#detail")
    ).toBe("https://pan.quark.cn/s/AbC123");
    expect(getLinkPlatform("https://www.alipan.com/s/abc")).toBe("aliyun");
  });

  it("rejects non-share hosts and non-http protocols", () => {
    expect(normalizeLinkHealthUrl("https://example.com/s/abc")).toBeNull();
    expect(normalizeLinkHealthUrl("magnet:?xt=urn:btih:abc")).toBeNull();
  });

  it("supports supplemental drives and canonical magnet hashes", () => {
    const magnet = `magnet:?xt=urn:btih:${"A".repeat(40)}&tr=udp://tracker`;
    expect(getLinkPlatform("https://mypikpak.com/s/abc")).toBe("pikpak");
    expect(getLinkPlatform(magnet)).toBe("magnet");
    expect(normalizeLinkHealthUrl(magnet)).toBe(`magnet:${"a".repeat(40)}`);
  });

  it("requires two independent failures before confirming a dead link", () => {
    expect(classifyLinkHealth(1, 0, 0)).toBe("unknown");
    expect(classifyLinkHealth(2, 0, 0)).toBe("dead");
    expect(classifyLinkHealth(2, 2, 0)).toBe("alive");
    expect(classifyLinkHealth(0, 1, 1)).toBe("password");
  });

  it("creates stable SHA-256 keys", async () => {
    await expect(sha256Hex("haosouku")).resolves.toMatch(/^[a-f0-9]{64}$/);
    await expect(sha256Hex("haosouku")).resolves.toBe(
      await sha256Hex("haosouku")
    );
  });

  it("removes confirmed dead links from merged and detailed search results", () => {
    const deadUrl = "https://pan.quark.cn/s/dead123";
    const aliveUrl = "https://pan.quark.cn/s/alive123";
    const result = removeDeadSearchLinks(
      {
        total: 2,
        merged_by_type: {
          quark: [
            { url: deadUrl, password: "", note: "失效", datetime: "" },
            { url: aliveUrl, password: "", note: "有效", datetime: "" },
          ],
        },
        results: [
          {
            message_id: "1",
            unique_id: "1",
            channel: "test",
            datetime: "",
            title: "失效",
            content: "",
            links: [{ type: "quark", url: deadUrl, password: "" }],
          },
          {
            message_id: "2",
            unique_id: "2",
            channel: "test",
            datetime: "",
            title: "有效",
            content: "",
            links: [{ type: "quark", url: aliveUrl, password: "" }],
          },
        ],
      },
      new Set([deadUrl])
    );

    expect(result.filteredDeadCount).toBe(1);
    expect(result.response.filtered_dead_count).toBe(1);
    expect(result.response.total).toBe(1);
    expect(result.response.merged_by_type?.quark).toHaveLength(1);
    expect(result.response.results).toHaveLength(1);
    expect(result.response.results?.[0].links[0].url).toBe(aliveUrl);
  });

  it("keeps uncertain links visible but moves them behind normal results", () => {
    const suspectUrl = "https://pan.quark.cn/s/suspect123";
    const aliveUrl = "https://pan.quark.cn/s/alive123";
    const response = deprioritizeSuspectSearchLinks(
      {
        total: 2,
        merged_by_type: {
          quark: [
            { url: suspectUrl, password: "", note: "待复核", datetime: "" },
            { url: aliveUrl, password: "", note: "正常", datetime: "" },
          ],
        },
      },
      new Set([suspectUrl])
    );
    expect(response.merged_by_type?.quark.map((item) => item.url)).toEqual([
      aliveUrl,
      suspectUrl,
    ]);
  });

  it("adds known health status to merged links for filtering and ranking", () => {
    const url = "https://pan.quark.cn/s/alive123";
    const response = annotateSearchLinkHealth(
      {
        total: 1,
        merged_by_type: {
          quark: [{ url, password: "", note: "三体", datetime: "" }],
        },
      },
      new Map([[url, "alive"]])
    );
    expect(response.merged_by_type?.quark[0]?.health_status).toBe("alive");
  });
});
