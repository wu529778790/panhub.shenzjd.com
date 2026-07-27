import { describe, expect, it, vi } from "vitest";
import {
  fetchLatestEntertainment,
  HOME_COLLECTIONS,
  MINIMUM_HOME_MOVIE_COUNT,
  MINIMUM_MOVIE_RATING,
  parseEntertainmentCollection,
} from "../../server/core/services/entertainmentLatestService";

const moviePayload = {
  subject_collection_items: [
    {
      id: "movie-1",
      title: "测试电影",
      year: "2026",
      release_date: "07.23",
      card_subtitle: "2026 / 中国大陆 / 剧情 喜剧 / 导演 / 演员",
      cover: {
        url: "https://img9.doubanio.com/view/photo/test-movie.jpg",
      },
      rating: { value: 8.26, count: 1234 },
    },
  ],
};

const tvPayload = {
  subject_collection_items: [
    {
      id: "tv-1",
      title: "测试剧集",
      year: "2026",
      episodes_info: "更新至 8 集",
      card_subtitle: "2026 / 中国大陆 / 悬疑 犯罪 / 导演 / 演员",
      pic: {
        large: "https://img3.doubanio.com/view/photo/test-tv.jpg",
      },
      rating: { value: 0 },
    },
  ],
};

describe("首页近期影视数据", () => {
  it("把电影数据整理为稳定的首页字段", () => {
    expect(parseEntertainmentCollection(moviePayload, "movie")).toEqual([
      {
        id: "movie-1",
        kind: "movie",
        title: "测试电影",
        cover: "https://img9.doubanio.com/view/photo/test-movie.jpg",
        rating: 8.3,
        ratingCount: 1234,
        year: "2026",
        genres: ["剧情", "喜剧"],
        progress: "07.23 上映",
      },
    ]);
  });

  it("保留电视剧更新进度，不把零分显示为真实评分", () => {
    expect(parseEntertainmentCollection(tvPayload, "tv")).toEqual([
      {
        id: "tv-1",
        kind: "tv",
        title: "测试剧集",
        cover: "https://img3.doubanio.com/view/photo/test-tv.jpg",
        year: "2026",
        genres: ["悬疑", "犯罪"],
        progress: "更新至 8 集",
      },
    ]);
  });

  it("评分人数缺失时不伪造 ratingCount", () => {
    const items = parseEntertainmentCollection(
      {
        subject_collection_items: [
          {
            ...moviePayload.subject_collection_items[0],
            rating: { value: 8.26 },
          },
        ],
      },
      "movie"
    );

    expect(items[0]).toMatchObject({ rating: 8.3 });
    expect(items[0]).not.toHaveProperty("ratingCount");
  });

  it("电影片单严格过滤 6 分以下和未评分条目", () => {
    const items = parseEntertainmentCollection(
      {
        subject_collection_items: [
          ...moviePayload.subject_collection_items,
          {
            id: "movie-low",
            title: "低分电影",
            year: "2026",
            cover: {
              url: "https://img9.doubanio.com/view/photo/test-low.jpg",
            },
            rating: { value: 5.9 },
          },
          {
            id: "movie-unrated",
            title: "未评分电影",
            year: "2026",
            cover: {
              url: "https://img9.doubanio.com/view/photo/test-unrated.jpg",
            },
            rating: { value: 0 },
          },
        ],
      },
      "movie",
      12,
      { minimumRating: MINIMUM_MOVIE_RATING }
    );

    expect(items.map((item) => item.id)).toEqual(["movie-1"]);
  });

  it("并发获取电影和电视剧的多组首页片单", async () => {
    const fetchMock = vi.fn().mockImplementation((input: string | URL) => {
      const url = String(input);
      if (url.includes("/movie_top250/")) {
        const start = Number(new URL(url).searchParams.get("start") || 0);
        const count = Math.min(100, 250 - start);
        return Promise.resolve(
          Response.json({
            start,
            total: 250,
            subject_collection_items: Array.from({ length: count }, (_, index) => ({
              ...moviePayload.subject_collection_items[0],
              id: `top250-${start + index}`,
              title: `高分电影 ${start + index + 1}`,
            })),
          })
        );
      }
      if (
        url.includes("/movie_hot_gaia/") ||
        url.includes("/movie_latest/")
      ) {
        const source = url.includes("/movie_hot_gaia/") ? "hot" : "latest";
        return Promise.resolve(
          Response.json({
            start: 0,
            total: 50,
            subject_collection_items: Array.from({ length: 50 }, (_, index) => ({
              ...moviePayload.subject_collection_items[0],
              id: `${source}-${index}`,
              title: `${source === "hot" ? "热门" : "近期"}电影 ${index + 1}`,
            })),
          })
        );
      }
      return Promise.resolve(
        Response.json(url.includes("/movie_") ? moviePayload : tvPayload)
      );
    });

    const result = await fetchLatestEntertainment(8, fetchMock);

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(
      HOME_COLLECTIONS.length
    );
    expect(result.movies.length).toBeGreaterThanOrEqual(
      MINIMUM_HOME_MOVIE_COUNT
    );
    expect(new Set(result.movies.map((item) => item.id)).size).toBe(
      result.movies.length
    );
    expect(result.movies[0]?.title).toBe("测试电影");
    expect(
      HOME_COLLECTIONS.some((collection) => collection.source === "movie_showing")
    ).toBe(false);
    expect(result.tv[0]?.title).toBe("测试剧集");
    expect(result.collections.some((collection) => collection.kind === "movie"))
      .toBe(true);
    expect(result.collections.some((collection) => collection.kind === "tv"))
      .toBe(true);
    expect(result.updatedAt).toBeGreaterThan(0);
  });

  it("忽略缺少标题、封面或可信图片域名的条目", () => {
    expect(
      parseEntertainmentCollection(
        {
          subject_collection_items: [
            { id: "1", title: "", cover: { url: "https://img9.doubanio.com/a.jpg" } },
            { id: "2", title: "无封面" },
            { id: "3", title: "其他域名", cover: { url: "https://example.com/a.jpg" } },
          ],
        },
        "movie"
      )
    ).toEqual([]);
  });
});
