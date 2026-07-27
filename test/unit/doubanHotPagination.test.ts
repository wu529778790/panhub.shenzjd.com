import { beforeEach, describe, expect, it, vi } from "vitest";

const { ofetchMock } = vi.hoisted(() => ({
  ofetchMock: vi.fn(),
}));

vi.mock("ofetch", () => ({
  ofetch: ofetchMock,
}));

import {
  fetchDoubanHotByCategory,
  isUsableDoubanHotPage,
} from "../../server/core/services/doubanHotService";

function item(id: number) {
  return {
    id: String(id),
    title: `影片 ${id}`,
    score: "8.6",
    rating: ["8.6"],
    cover_url: `https://img.example.com/${id}.jpg`,
    url: `https://movie.douban.com/subject/${id}/`,
    types: ["剧情"],
    regions: ["中国大陆"],
    actors: [],
    release_date: "2026-01-01",
    vote_count: 1200,
    rank: id,
  };
}

describe("豆瓣热门分类分页", () => {
  beforeEach(() => {
    ofetchMock.mockReset();
  });

  it("只请求当前页并保留继续加载状态", async () => {
    ofetchMock.mockResolvedValue(Array.from({ length: 10 }, (_, index) => item(11 + index)));

    const result = await fetchDoubanHotByCategory("douban-action", 2, 10);

    expect(ofetchMock).toHaveBeenCalledTimes(1);
    expect(ofetchMock.mock.calls[0][0]).toContain("start=10&limit=10");
    expect(result.items).toHaveLength(10);
    expect(result.items[0].title).toBe("【8.6】影片 11");
    expect(result.hasMore).toBe(true);
  });

  it("上游返回不足一页时停止续载", async () => {
    ofetchMock.mockResolvedValue([item(501), item(502)]);

    const result = await fetchDoubanHotByCategory("douban-comedy", 31, 10);

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(false);
  });

  it("不会缓存首页的临时空结果", async () => {
    ofetchMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(Array.from({ length: 10 }, (_, index) => item(701 + index)));

    const emptyResult = await fetchDoubanHotByCategory("douban-romance", 1, 10);
    const recoveredResult = await fetchDoubanHotByCategory("douban-romance", 1, 10);

    expect(isUsableDoubanHotPage(emptyResult, 1)).toBe(false);
    expect(recoveredResult.items).toHaveLength(10);
    expect(ofetchMock).toHaveBeenCalledTimes(2);
  });
});
