import { describe, expect, it } from "vitest";
import {
  allSeoPages,
  categoryPages,
  getSeoPage,
  getIndexableSeoPages,
  getSeoPageTextLength,
  guidePages,
  intentPages,
  isSeoPageIndexable,
  panPages,
  seoHubs,
  topicPages,
} from "../../config/seoContent";
import {
  getIntentLongTailKeywords,
  INTENT_LONG_TAIL_KEYWORD_TARGET,
} from "../../config/seoIntentContent";
import {
  discoveryCategories,
  discoveryIntents,
  discoveryPlatforms,
  discoveryTopics,
} from "../../config/seoDiscovery";

function visiblePageText(page: (typeof allSeoPages)[number]): string {
  return [
    page.eyebrow,
    page.title,
    page.seoTitle,
    page.description,
    page.summary,
    ...(page.searchExamples || []),
    ...(page.keywordGroups || []).flatMap((group) => [
      group.label,
      group.description,
      ...group.keywords,
    ]),
    ...page.facts.flatMap((fact) => [fact.label, fact.value]),
    ...page.sections.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      ...(section.points || []),
    ]),
  ].join("\n");
}

describe("SEO content registry", () => {
  it("publishes only complete, unique pages", () => {
    const indexable = getIndexableSeoPages();
    expect(indexable).toHaveLength(allSeoPages.length);
    expect(new Set(indexable.map((page) => page.path)).size).toBe(indexable.length);
    expect(new Set(indexable.map((page) => page.seoTitle)).size).toBe(indexable.length);
    expect(new Set(indexable.map((page) => page.description)).size).toBe(indexable.length);
    expect(indexable.every(isSeoPageIndexable)).toBe(true);
  });

  it("keeps every indexable page above the content floor", () => {
    for (const page of getIndexableSeoPages()) {
      expect(getSeoPageTextLength(page), page.path).toBeGreaterThanOrEqual(220);
      expect(page.description.length, page.path).toBeGreaterThanOrEqual(35);
      expect(page.description.length, page.path).toBeLessThanOrEqual(170);
    }
  });

  it("provides one unique hub for each public content family", () => {
    expect(seoHubs.map((hub) => hub.path)).toEqual([
      "/pan",
      "/category",
      "/topic",
      "/search",
      "/guide",
    ]);
  });

  it("covers the planned platform, category, topic and guide clusters", () => {
    expect(panPages).toHaveLength(11);
    expect(categoryPages).toHaveLength(9);
    expect(topicPages).toHaveLength(67);
    expect(intentPages).toHaveLength(81);
    expect(guidePages).toHaveLength(11);
  });

  it("maps more than 5800 useful long-tail searches to visible pages", () => {
    const discoveryPages = allSeoPages.filter((page) => page.kind !== "legal");
    const allExamples = discoveryPages.flatMap((page) => [
      ...(page.searchExamples || []),
      ...(page.keywordGroups || []).flatMap((group) => group.keywords),
    ]);
    const primaryExamples = discoveryPages.map((page) => page.searchExamples?.[0]);

    expect(allExamples.length).toBeGreaterThanOrEqual(5800);
    expect(new Set(primaryExamples).size).toBe(primaryExamples.length);
    for (const page of discoveryPages) {
      expect(page.searchExamples?.length, page.path).toBeGreaterThanOrEqual(4);
      expect(page.searchExamples?.length, page.path).toBeLessThanOrEqual(5);
    }
  });

  it("adds exactly 5000 unique long-tail keywords to intent pages", () => {
    const keywords = getIntentLongTailKeywords();
    const pageKeywordCounts = intentPages.map((page) =>
      (page.keywordGroups || []).reduce(
        (total, group) => total + group.keywords.length,
        0
      )
    );
    const existingExamples = new Set(
      allSeoPages.flatMap((page) => page.searchExamples || [])
    );
    const duplicateExamples = keywords.filter((keyword) =>
      existingExamples.has(keyword)
    );

    expect(keywords).toHaveLength(INTENT_LONG_TAIL_KEYWORD_TARGET);
    expect(new Set(keywords).size).toBe(INTENT_LONG_TAIL_KEYWORD_TARGET);
    expect(duplicateExamples).toEqual([]);
    expect(pageKeywordCounts.every((count) => count === 61 || count === 62)).toBe(true);
    expect(intentPages.every((page) => page.keywordGroups?.length === 5)).toBe(true);
    expect(keywords).toEqual(
      expect.arrayContaining([
        "115 网盘4K电影搜索",
        "高分电影115 网盘资源",
        "百度网盘公务员考试资料分享",
        "夸克网盘短剧合集怎么找",
        "Figma素材123 网盘资源搜索",
      ])
    );
  });

  it("maps validated multi-source keyword opportunities to existing pages", () => {
    const expectedTermsByPath: Record<string, string[]> = {
      "/category/movie": ["电影资源搜索引擎"],
      "/category/tv": ["电视剧资源搜索网站", "电视剧资源搜索引擎"],
      "/topic/lossless-music": ["无损音乐搜索引擎"],
      "/topic/ebooks": ["电子书资源搜索引擎"],
      "/topic/video-material": ["视频素材库"],
      "/topic/sound-effects": ["音效素材库"],
      "/topic/font-assets": ["字体素材包"],
      "/topic/icon-assets": ["图标素材库"],
      "/topic/ae-template": ["AE模板网站"],
      "/topic/premiere-template": ["PR模板网"],
      "/topic/3d-models": ["3D模型素材网站"],
      "/topic/excel-template": ["Excel表格模板大全"],
      "/topic/lesson-plan": ["教案课件资源网"],
      "/topic/ecommerce-assets": ["电商设计素材网站"],
      "/topic/comic": ["漫画资源搜索引擎"],
      "/topic/concert": ["演唱会资源网站"],
      "/topic/texture-assets": ["纹理素材网站", "纹理素材图片"],
      "/topic/notion-template": ["Notion模板库", "Notion模板分享"],
      "/topic/toefl": ["托福资料百度网盘"],
      "/topic/legal-exam": ["法考资料百度网盘", "法考资料2026"],
      "/topic/data-analysis": ["数据分析课程百度网盘"],
      "/guide/search-modes": ["网盘精确搜索在哪里", "百度网盘模糊搜索"],
    };

    for (const [path, expectedTerms] of Object.entries(expectedTermsByPath)) {
      const page = getSeoPage(path);
      expect(page, path).toBeDefined();
      expect(page?.searchExamples, path).toEqual(
        expect.arrayContaining(expectedTerms)
      );
    }
  });

  it("keeps related links valid and useful", () => {
    for (const page of allSeoPages) {
      expect(page.related.length, page.path).toBeGreaterThanOrEqual(3);
      for (const path of page.related) {
        expect(getSeoPage(path), `${page.path} -> ${path}`).toBeDefined();
      }
    }
  });

  it("keeps the lightweight homepage directory in sync", () => {
    const discoveryLinks = [
      ...discoveryPlatforms,
      ...discoveryCategories,
      ...discoveryTopics,
      ...discoveryIntents,
    ];

    for (const item of discoveryLinks) {
      const page = getSeoPage(item.path);
      expect(page, item.path).toBeDefined();
      expect(page?.slug, item.path).toBe(item.slug);
      const expectedTitle = item.path.startsWith("/pan/")
        ? page?.title.replace("资源搜索", "")
        : item.path.startsWith("/search/")
          ? page?.title.replace("怎么搜", "")
        : page?.title;
      expect(expectedTitle, item.path).toBe(item.title);
    }
  });

  it("marks movie editorial pages with the cinema presentation", () => {
    for (const path of [
      "/category/movie",
      "/topic/4k-movie",
      "/topic/classic-movie",
      "/topic/movie-subtitles",
    ]) {
      expect(getSeoPage(path)?.visualStyle, path).toBe("cinema");
    }

    expect(getSeoPage("/topic/magnet-search")?.visualStyle).toBeUndefined();
    expect(getSeoPage("/topic/4k-movie")?.facts).toEqual(
      expect.arrayContaining([
        { label: "推荐写法", value: "片名 + 年份 + 2160P" },
        { label: "打开后核对", value: "片源、容量、兼容性" },
      ])
    );
  });

  it("gives every topic a unique, descriptive hero visual", () => {
    expect(topicPages).toHaveLength(67);
    expect(topicPages.every((page) => Boolean(page.heroImage))).toBe(true);
    expect(new Set(topicPages.map((page) => page.heroImage?.src)).size).toBe(67);
    expect(new Set(topicPages.map((page) => page.heroImage?.fallback)).size).toBe(67);

    for (const page of topicPages) {
      expect(page.heroImage?.src, page.path).toBe(
        `/topic-images/${page.slug}.webp`
      );
      expect(page.heroImage?.fallback, page.path).toBe(
        `/topic-images/${page.slug}.jpg`
      );
      expect(page.heroImage?.alt.length, page.path).toBeGreaterThanOrEqual(10);
      expect(page.heroImage?.width, page.path).toBe(1200);
      expect(page.heroImage?.height, page.path).toBe(800);
    }
  });

  it("publishes useful platform and content combinations", () => {
    expect(getSeoPage("/search/115-movie")?.searchExamples).toEqual(
      expect.arrayContaining([
        "115 网盘电影资源搜索",
        "115 网盘4K电影资源",
      ])
    );
    expect(getSeoPage("/search/quark-short-drama")?.related).toEqual(
      expect.arrayContaining([
        "/pan/quark",
        "/category/tv",
        "/topic/short-drama",
      ])
    );
    expect(intentPages.every((page) => Boolean(page.heroImage))).toBe(true);
  });

  it("avoids common generated-copy tells in visible content", () => {
    const banned = /致力于|一站式|海量资源|全网最全|高效便捷|轻松找到|丰富多样|应有尽有|赋能|—|–/;
    for (const page of allSeoPages) {
      expect(visiblePageText(page), page.path).not.toMatch(banned);
    }
  });
});
