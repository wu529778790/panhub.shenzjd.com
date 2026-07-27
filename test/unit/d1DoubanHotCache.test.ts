import { describe, expect, it, vi } from "vitest";
import {
  createD1DoubanHotCacheKey,
  getD1DoubanHotCache,
  parseD1DoubanHotCacheEntry,
  saveD1DoubanHotCache,
} from "../../server/core/services/d1DoubanHotCache";

describe("D1 豆瓣榜单缓存", () => {
  it("使用分类和分页参数生成稳定键", () => {
    expect(createD1DoubanHotCacheKey("douban-top250", 2, 10)).toBe(
      "douban-top250:2:10"
    );
  });

  it("拒绝损坏数据和首页空快照", () => {
    expect(parseD1DoubanHotCacheEntry("not-json", 1, 1)).toBeUndefined();
    expect(
      parseD1DoubanHotCacheEntry('{"items":[],"hasMore":false}', 1, 1)
    ).toBeUndefined();
  });

  it("读取最后一次成功片单", async () => {
    const first = vi.fn().mockResolvedValue({
      payload_json: JSON.stringify({
        items: [{ id: 1, title: "【9.7】测试影片" }],
        hasMore: true,
      }),
      updated_at: 123,
    });
    const statement = {
      bind: vi.fn(),
      first,
      all: vi.fn(),
      run: vi.fn(),
    };
    statement.bind.mockReturnValue(statement);
    const database = { prepare: vi.fn().mockReturnValue(statement) };

    const result = await getD1DoubanHotCache(database, "douban-top250", 1, 10);

    expect(result).toEqual({
      items: [{ id: 1, title: "【9.7】测试影片" }],
      hasMore: true,
      updatedAt: 123,
    });
  });

  it("不会写入首页空快照", async () => {
    const database = { prepare: vi.fn() };

    await saveD1DoubanHotCache(
      database as any,
      "douban-top250",
      1,
      10,
      { items: [], hasMore: false }
    );

    expect(database.prepare).not.toHaveBeenCalled();
  });
});
