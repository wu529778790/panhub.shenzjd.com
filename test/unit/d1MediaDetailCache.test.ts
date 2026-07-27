import { describe, expect, it, vi } from "vitest";
import {
  getD1MediaDetailCache,
  parseD1MediaDetailCacheEntry,
  saveD1MediaDetailCache,
} from "../../server/core/services/d1MediaDetailCache";
import type { MediaDetail } from "../../server/core/services/mediaDetailService";

const detail: MediaDetail = {
  id: "1292052",
  kind: "movie",
  title: "肖申克的救赎",
  originalTitle: "The Shawshank Redemption",
  year: "1994",
  cover:
    "https://img3.doubanio.com/view/photo/m_ratio_poster/public/p480747492.jpg",
  rating: 9.7,
  ratingCount: 3307436,
  intro: "剧情简介",
  genres: ["剧情"],
  countries: ["美国"],
  languages: ["英语"],
  durations: ["142分钟"],
  directors: [{ name: "弗兰克·德拉邦特" }],
  actors: [{ name: "蒂姆·罗宾斯" }],
  aliases: [],
  releaseDates: [],
  episodeInfo: "",
  honors: [],
  doubanUrl: "https://movie.douban.com/subject/1292052/",
  updatedAt: 123,
};

function statement(row?: Record<string, unknown>) {
  const value = {
    bind: vi.fn(),
    first: vi.fn().mockResolvedValue(row || null),
    all: vi.fn(),
    run: vi.fn().mockResolvedValue({ success: true }),
  };
  value.bind.mockReturnValue(value);
  return value;
}

describe("D1 影视详情缓存", () => {
  it("拒绝损坏快照", () => {
    expect(parseD1MediaDetailCacheEntry("bad-json", 1)).toBeUndefined();
    expect(
      parseD1MediaDetailCacheEntry(JSON.stringify({ title: "缺少 ID" }), 1)
    ).toBeUndefined();
  });

  it("读取并使用数据库更新时间", async () => {
    const prepared = statement({
      payload_json: JSON.stringify(detail),
      updated_at: 456,
    });
    const database = { prepare: vi.fn().mockReturnValue(prepared) };

    await expect(
      getD1MediaDetailCache(database as any, detail.id)
    ).resolves.toMatchObject({ title: detail.title, updatedAt: 456 });
    expect(prepared.bind).toHaveBeenCalledWith(detail.id);
  });

  it("保存完整详情快照", async () => {
    const prepared = statement();
    const database = { prepare: vi.fn().mockReturnValue(prepared) };
    await saveD1MediaDetailCache(database as any, detail);

    expect(prepared.run).toHaveBeenCalledOnce();
    expect(prepared.bind).toHaveBeenCalledWith(
      detail.id,
      "movie",
      detail.title,
      expect.stringContaining("The Shawshank Redemption"),
      detail.updatedAt
    );
  });
});
