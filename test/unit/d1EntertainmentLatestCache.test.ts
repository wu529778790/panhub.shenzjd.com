import { describe, expect, it, vi } from "vitest";
import {
  getEntertainmentLatestCache,
  parseEntertainmentLatestCache,
  saveEntertainmentLatestCache,
} from "../../server/core/services/d1EntertainmentLatestCache";

const movies = [{
    id: "movie-1",
    kind: "movie" as const,
    title: "测试电影",
    cover: "https://img9.doubanio.com/movie.jpg",
    year: "2026",
    genres: ["剧情"],
    progress: "07.23 上映",
  }];
const tv = [{
    id: "tv-1",
    kind: "tv" as const,
    title: "测试剧集",
    cover: "https://img3.doubanio.com/tv.jpg",
    year: "2026",
    genres: ["悬疑"],
    progress: "更新至 8 集",
  }];
const data = {
  movies,
  tv,
  collections: [
    {
      id: "movie-library",
      kind: "movie" as const,
      title: "高分电影",
      description: "豆瓣高分电影片单",
      items: movies,
    },
    {
      id: "tv-hot",
      kind: "tv" as const,
      title: "近期热播",
      description: "豆瓣近期热播片单",
      items: tv,
    },
  ],
  updatedAt: 123,
};

describe("D1 首页影视缓存", () => {
  it("拒绝损坏或只有单一分区的快照", () => {
    expect(parseEntertainmentLatestCache("bad-json", 1)).toBeUndefined();
    expect(
      parseEntertainmentLatestCache(
        JSON.stringify({ movies: data.movies, tv: [] }),
        1
      )
    ).toBeUndefined();
  });

  it("读取最后一次完整快照", async () => {
    const statement = {
      bind: vi.fn(),
      first: vi.fn().mockResolvedValue({
        payload_json: JSON.stringify({
          movies: data.movies,
          tv: data.tv,
          collections: data.collections,
        }),
        updated_at: 123,
      }),
      all: vi.fn(),
      run: vi.fn(),
    };
    statement.bind.mockReturnValue(statement);
    const database = { prepare: vi.fn().mockReturnValue(statement) };

    await expect(getEntertainmentLatestCache(database as any)).resolves.toEqual(data);
    expect(statement.bind).toHaveBeenCalledWith("homepage");
  });

  it("以单条事务安全的 upsert 保存完整快照", async () => {
    const statement = {
      bind: vi.fn(),
      first: vi.fn(),
      all: vi.fn(),
      run: vi.fn().mockResolvedValue({ success: true }),
    };
    statement.bind.mockReturnValue(statement);
    const database = { prepare: vi.fn().mockReturnValue(statement) };

    await saveEntertainmentLatestCache(database as any, data);

    expect(statement.run).toHaveBeenCalledOnce();
    expect(statement.bind).toHaveBeenCalledWith(
      "homepage",
      expect.stringContaining("测试电影"),
      123
    );
  });
});
