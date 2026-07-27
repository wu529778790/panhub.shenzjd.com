import { describe, expect, it } from "vitest";
import type { SearchViewItem } from "../../types/search";
import {
  groupCloudSearchItems,
  normalizeCloudResultTitle,
} from "../../utils/groupCloudSearchItems";

function item(
  type: string,
  title: string,
  url: string,
  extra: Partial<SearchViewItem> = {}
): SearchViewItem {
  return {
    id: url,
    type,
    title,
    url,
    password: "",
    note: title,
    datetime: "",
    ...extra,
  };
}

describe("groupCloudSearchItems", () => {
  it("normalizes harmless title punctuation and spacing", () => {
    expect(normalizeCloudResultTitle("<电影> 三体：4K"))
      .toBe(normalizeCloudResultTitle("电影 三体 4K"));
  });

  it("groups matching titles on the same platform and keeps backup links", () => {
    const grouped = groupCloudSearchItems([
      item("baidu", "耀眼 (4K)", "https://pan.baidu.com/s/first"),
      item("baidu", "耀眼(4K)", "https://pan.baidu.com/s/second"),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.alternate_links).toHaveLength(1);
    expect(grouped[0]?.alternate_links?.[0]?.url).toBe(
      "https://pan.baidu.com/s/second"
    );
  });

  it("does not combine the same title across different platforms", () => {
    const grouped = groupCloudSearchItems([
      item("baidu", "三体 4K", "https://pan.baidu.com/s/one"),
      item("quark", "三体 4K", "https://pan.quark.cn/s/two"),
    ]);

    expect(grouped).toHaveLength(2);
  });

  it("chooses a verified working backup as the primary link", () => {
    const dead = item("quark", "三体 4K", "https://pan.quark.cn/s/dead");
    const alive = item("quark", "三体4K", "https://pan.quark.cn/s/alive");
    const grouped = groupCloudSearchItems(
      [dead, alive],
      (url) => url.endsWith("alive") ? "alive" : "dead"
    );

    expect(grouped[0]?.url).toBe(alive.url);
    expect(grouped[0]?.alternate_links?.[0]?.url).toBe(dead.url);
  });

  it("keeps different releases separate", () => {
    const grouped = groupCloudSearchItems([
      item("quark", "三体 第一季 4K", "https://pan.quark.cn/s/one"),
      item("quark", "三体 第二季 4K", "https://pan.quark.cn/s/two"),
    ]);

    expect(grouped).toHaveLength(2);
  });
});
