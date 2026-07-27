import { describe, expect, it, vi } from "vitest";
import {
  fetchDoubanMediaDetail,
  isValidDoubanSubjectId,
  parseDoubanMediaDetail,
} from "../../server/core/services/mediaDetailService";

const rawDetail = {
  id: "1292052",
  title: "肖申克的救赎",
  original_title: "The Shawshank Redemption",
  year: "1994",
  is_tv: false,
  pic: {
    large:
      "https://img3.doubanio.com/view/photo/m_ratio_poster/public/p480747492.jpg",
  },
  rating: { value: 9.7, count: 3307436 },
  intro: "银行家安迪蒙冤入狱，并在漫长岁月里寻找自由。",
  genres: ["剧情", "犯罪"],
  countries: ["美国"],
  languages: ["英语"],
  durations: ["142分钟"],
  directors: [{ name: "弗兰克·德拉邦特" }],
  actors: [{ name: "蒂姆·罗宾斯" }, { name: "摩根·弗里曼" }],
  aka: ["月黑高飞(港)"],
  pubdate: ["1994-09-10(多伦多电影节)"],
  honor_infos: [{ title: "豆瓣电影Top250", rank: 1 }],
};

describe("豆瓣影视详情", () => {
  it("只接受数字豆瓣条目 ID", () => {
    expect(isValidDoubanSubjectId("1292052")).toBe(true);
    expect(isValidDoubanSubjectId("../1292052")).toBe(false);
    expect(isValidDoubanSubjectId("abc")).toBe(false);
  });

  it("规范化电影资料和评分人数", () => {
    const detail = parseDoubanMediaDetail(rawDetail, "1292052", 123);
    expect(detail).toMatchObject({
      id: "1292052",
      kind: "movie",
      title: "肖申克的救赎",
      originalTitle: "The Shawshank Redemption",
      year: "1994",
      rating: 9.7,
      ratingCount: 3307436,
      genres: ["剧情", "犯罪"],
      directors: [{ name: "弗兰克·德拉邦特" }],
      honors: [{ title: "豆瓣电影Top250", rank: 1 }],
      updatedAt: 123,
    });
  });

  it("拒绝条目 ID 不一致和非豆瓣封面", () => {
    expect(parseDoubanMediaDetail(rawDetail, "1291546")).toBeUndefined();
    expect(
      parseDoubanMediaDetail(
        { ...rawDetail, pic: { large: "https://example.com/poster.jpg" } },
        "1292052"
      )
    ).toBeUndefined();
  });

  it("通过移动端接口获取并解析详情", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(rawDetail), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    await expect(
      fetchDoubanMediaDetail("1292052", fetchImpl)
    ).resolves.toMatchObject({ title: "肖申克的救赎" });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/movie/1292052"),
      expect.objectContaining({
        headers: expect.objectContaining({
          referer: "https://m.douban.com/",
        }),
      })
    );
  });
});
