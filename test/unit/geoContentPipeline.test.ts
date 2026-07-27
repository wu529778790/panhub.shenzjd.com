import { describe, expect, it } from "vitest";
import {
  assessGeoContent,
  candidateVariants,
  classifyGeoKeyword,
  contentSimilarity,
  extractGeneratedGeoJson,
  finalizeGeneratedGeoContent,
  geoKeywordSlug,
  normalizeGeoKeyword,
  sanitizeGeneratedGeoContent,
  type GeneratedGeoContent,
} from "../../cloudflare/resource-sync/src/geo";

function completeContent(): GeneratedGeoContent {
  const paragraph =
    "先保留作品名、课程名或资料名里的核心信息，再根据结果数量补充年份、季数、作者、版本、文件格式和网盘平台。查看结果时应比较标题完整度、更新时间、平台类型和链接状态，不要只打开排序最靠前的一条。分享页要求登录不一定代表失效，只有明确显示分享取消、文件不存在或地址错误时，才适合提交失效反馈。";
  return {
    title: "电影网盘资源怎么找",
    seoTitle: "电影网盘资源怎么找 - 搜索方法与筛选建议",
    description:
      "整理电影网盘公开索引的搜索写法、版本筛选、链接状态判断和安全使用方法，并说明结果过多、结果过少以及分享失效时的处理顺序，帮助用户减少无效尝试。",
    summary:
      "从准确片名开始搜索，再根据年份、清晰度、字幕和平台逐步缩小范围。",
    answer:
      "搜索电影资源时，先输入准确片名。结果过多再添加上映年份、4K、字幕或具体平台，结果过少则删除宣传词和不必要的限定。打开结果后再核对版本、文件格式和链接状态，不要把登录提示直接当成失效。",
    sections: [
      {
        title: "先确定核心搜索词",
        paragraphs: [paragraph, paragraph],
      },
      {
        title: "按版本和平台筛选",
        paragraphs: [paragraph, paragraph],
        points: ["核对年份与季数", "区分原盘、压制和字幕版本"],
      },
      {
        title: "判断链接状态",
        paragraphs: [paragraph, paragraph],
      },
    ],
    faq: [
      {
        question: "为什么加上很多条件后反而没有结果？",
        answer: "限定词过多会错过标题写法不同的记录，可以先删除平台和宣传词。",
      },
      {
        question: "要求登录的链接算失效吗？",
        answer: "登录提示不等于失效，应以分享取消、文件不存在等明确提示为准。",
      },
    ],
    searchExamples: ["电影名 2026 4K", "电影名 字幕", "电影名 115网盘"],
  };
}

describe("GEO content pipeline", () => {
  it("normalizes and classifies Chinese long-tail keywords", () => {
    expect(normalizeGeoKeyword("  115 网盘  4K电影怎么找？ ")).toBe(
      "115 网盘 4k电影怎么找"
    );
    expect(classifyGeoKeyword("115 网盘 4K电影怎么找")).toEqual({
      category: "电影",
      intent: "how_to",
      platform: "115",
    });
  });

  it("creates one canonical long-tail page per search topic", () => {
    expect(
      candidateVariants({
        query: "铁拳教育",
        search_count: 3,
        no_result_count: 0,
        result_count: 8,
        click_count: 1,
      })
    ).toEqual(["铁拳教育网盘搜索技巧"]);
    expect(
      candidateVariants({
        query: "铁拳教育115网盘",
        search_count: 3,
        no_result_count: 0,
        result_count: 8,
        click_count: 1,
      })
    ).toEqual(["铁拳教育115网盘搜索技巧"]);
  });

  it("creates stable ASCII slugs", () => {
    const slug = geoKeywordSlug("115 网盘 4K电影怎么找");
    expect(slug).toMatch(/^115-movie-guide-[a-z0-9]+$/);
    expect(geoKeywordSlug("115 网盘 4K电影怎么找")).toBe(slug);
  });

  it("sanitizes generated JSON into bounded content", () => {
    const content = sanitizeGeneratedGeoContent(
      {
        title: "测试标题",
        seoTitle: "测试标题 - 好搜库",
        description: "说明".repeat(120),
        summary: "摘要",
        answer: "回答",
        sections: [
          { title: "方法", paragraphs: ["第一段"], points: ["要点"] },
          { title: "", paragraphs: [] },
        ],
        faq: [{ question: "问题？", answer: "答案。" }],
        searchExamples: Array.from({ length: 20 }, (_, index) => `搜索${index}`),
      },
      "测试关键词"
    );
    expect(content.description.length).toBeLessThanOrEqual(160);
    expect(content.sections).toHaveLength(1);
    expect(content.searchExamples).toHaveLength(8);
  });

  it("extracts JSON from Workers AI response variants", () => {
    const generated = {
      title: "测试标题",
      answer: "测试回答",
      sections: [],
    };
    expect(extractGeneratedGeoJson({ response: JSON.stringify(generated) })).toEqual(
      generated
    );
    expect(
      extractGeneratedGeoJson({
        choices: [
          {
            message: {
              content: `\`\`\`json\n${JSON.stringify(generated)}\n\`\`\``,
            },
          },
        ],
      })
    ).toEqual(generated);
    expect(extractGeneratedGeoJson({ response: generated })).toEqual(generated);
    expect(
      extractGeneratedGeoJson({
        choices: [
          {
            message: {
              content: "",
              reasoning_content: `推理过程\n${JSON.stringify(generated)}`,
            },
          },
        ],
      })
    ).toEqual(generated);
    expect(
      extractGeneratedGeoJson({
        choices: [
          {
            message: {
              content: [{ type: "text", text: JSON.stringify(generated) }],
            },
          },
        ],
      })
    ).toEqual(generated);
  });

  it("detects duplicate content", () => {
    const paragraph = "准确片名 年份 平台 字幕 版本 链接状态";
    expect(contentSimilarity(paragraph, paragraph)).toBe(1);
    expect(contentSimilarity(paragraph, "完全不同的课程资料和作者信息")).toBeLessThan(
      0.35
    );
  });

  it("publishes complete evidence-backed content", () => {
    const assessment = assessGeoContent(
      completeContent(),
      "电影网盘资源怎么找",
      4,
      0.12
    );
    expect(assessment.wordCount).toBeGreaterThan(420);
    expect(assessment.score).toBeGreaterThanOrEqual(72);
    expect(assessment.publishable).toBe(true);
  });

  it("rejects thin or highly duplicated content", () => {
    const thin = completeContent();
    thin.sections = thin.sections.slice(0, 1);
    thin.answer = "直接搜索。";
    const assessment = assessGeoContent(
      thin,
      "电影网盘资源怎么找",
      0,
      0.86
    );
    expect(assessment.publishable).toBe(false);
    expect(assessment.issues).toEqual(
      expect.arrayContaining([
        "正文结构不足",
        "缺少可核对材料",
        "与已发布页面过于相似",
        "直接回答过短",
      ])
    );
  });

  it("hard-rejects keyword stuffing and unsupported promises", () => {
    const stuffed = completeContent();
    stuffed.answer = "电影网盘资源怎么找".repeat(24);
    expect(
      assessGeoContent(stuffed, "电影网盘资源怎么找", 4, 0.1).publishable
    ).toBe(false);

    const promised = completeContent();
    promised.answer += "保证一定能找到。";
    expect(
      assessGeoContent(promised, "电影网盘资源怎么找", 4, 0.1).publishable
    ).toBe(false);

    const misleading = completeContent();
    misleading.answer += "优先查看quark平台的21489条记录。";
    const assessment = assessGeoContent(
      misleading,
      "电影网盘资源怎么找",
      4,
      0.1
    );
    expect(assessment.publishable).toBe(false);
    expect(assessment.issues).toEqual(
      expect.arrayContaining([
        "把聚合统计写成关键词结果",
        "包含内部平台代码",
      ])
    );

    const inferred = completeContent();
    inferred.answer += "百度网盘可能存在相关资源，优先选择记录较多的平台。";
    expect(
      assessGeoContent(inferred, "电影网盘资源怎么找", 4, 0.1).issues
    ).toContain("从聚合材料推断关键词可用性");
  });

  it("removes aggregate claims and repairs short metadata deterministically", () => {
    const unsafe = completeContent();
    unsafe.description = "简短说明。";
    unsafe.answer = "先搜索。无法保证链接长期有效。";
    unsafe.summary = "不同平台的记录数量和可访问性存在差异。";
    unsafe.sections[0].paragraphs[0] =
      "quark平台有314条记录，全部不可访问。";
    const finalized = finalizeGeneratedGeoContent(
      unsafe,
      "世界奇妙物语2026资源怎么找"
    );
    const serialized = JSON.stringify(finalized);
    expect(finalized.description.length).toBeGreaterThanOrEqual(60);
    expect(finalized.answer.length).toBeGreaterThanOrEqual(80);
    expect(serialized).not.toMatch(/\bquark\b/i);
    expect(serialized).not.toContain("314条");
    expect(serialized).not.toContain("记录数量和可访问性存在差异");
    expect(
      assessGeoContent(
        finalized,
        "世界奇妙物语2026资源怎么找",
        1,
        0.1
      ).issues
    ).not.toEqual(
      expect.arrayContaining([
        "把聚合统计写成关键词结果",
        "包含内部平台代码",
        "存在无法证实的承诺",
      ])
    );
  });
});
