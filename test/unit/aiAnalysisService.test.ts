import { describe, expect, it } from "vitest";
import { parseAiResponse } from "../../server/core/services/aiAnalysisService";

const requested = [
  { id: "quark:1", title: "测试资源", platform: "quark" },
  { id: "aliyun:2", title: "另一个资源", platform: "aliyun" },
];

describe("parseAiResponse", () => {
  it("parses a strict JSON object response", () => {
    const result = parseAiResponse(
      JSON.stringify({
        items: [
          {
            id: "quark:1",
            normalizedTitle: "测试资源 2026",
            category: "影视",
            tags: ["高清"],
            qualityScore: 82,
            confidence: 91,
            summary: "标题信息清晰",
            riskFlags: [],
          },
        ],
      }),
      requested
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: "quark:1",
        normalizedTitle: "测试资源 2026",
        category: "影视",
        qualityScore: 82,
      }),
    ]);
  });

  it("accepts a JSON markdown code fence", () => {
    const result = parseAiResponse(
      '```json\n[{"id":"aliyun:2","category":"资料","qualityScore":70,"confidence":60}]\n```',
      requested
    );

    expect(result[0]).toMatchObject({ id: "aliyun:2", category: "资料" });
  });

  it("drops unknown and duplicate resource ids", () => {
    const result = parseAiResponse(
      JSON.stringify([
        { id: "unknown", category: "影视" },
        { id: "quark:1", category: "影视" },
        { id: "quark:1", category: "软件" },
      ]),
      requested
    );

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("影视");
  });

  it("clamps scores and falls back to an allowed category", () => {
    const result = parseAiResponse(
      JSON.stringify([
        {
          id: "quark:1",
          category: "不存在",
          qualityScore: 130.4,
          confidence: -9,
        },
      ]),
      requested
    );

    expect(result[0]).toMatchObject({
      category: "其他",
      qualityScore: 100,
      confidence: 0,
    });
  });

  it("trims and limits tags and risk flags", () => {
    const result = parseAiResponse(
      JSON.stringify([
        {
          id: "quark:1",
          tags: ["  这是一个超过十八个字符长度的资源标签  ", "二", "三", "四", "五", 6],
          riskFlags: ["  可疑标题  ", "一", "二", "三", "四"],
        },
      ]),
      requested
    );

    expect(result[0].tags).toHaveLength(4);
    expect(result[0].tags[0].length).toBeLessThanOrEqual(18);
    expect(result[0].riskFlags).toEqual(["可疑标题", "一", "二", "三"]);
  });
});
