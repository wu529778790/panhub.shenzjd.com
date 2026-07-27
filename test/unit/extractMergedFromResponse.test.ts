/**
 * extractMergedFromResponse 单元测试
 */

import { describe, it, expect } from "vitest";
import { extractMergedFromResponse } from "../../utils/extractMergedFromResponse";

describe("extractMergedFromResponse", () => {
  it("应返回空对象当 data 为 undefined", () => {
    expect(extractMergedFromResponse(undefined)).toEqual({});
  });

  it("应返回空对象当 data 为 null", () => {
    expect(extractMergedFromResponse(null as any)).toEqual({});
  });

  it("应正确解析 merged_by_type 格式", () => {
    const data = {
      merged_by_type: {
        aliyun: [
          { url: "https://a.com", password: "", note: "测试", datetime: "2025-01-01" },
        ],
        quark: [
          { url: "https://q.com", password: "123", note: "夸克", datetime: "2025-01-02" },
        ],
      },
    };
    const result = extractMergedFromResponse(data);
    expect(result.aliyun).toHaveLength(1);
    expect(result.aliyun![0].url).toBe("https://a.com");
    expect(result.quark).toHaveLength(1);
    expect(result.quark![0].password).toBe("123");
  });

  it("应正确解析 results 中的 SearchResult 格式（带 links）", () => {
    const data = {
      results: [
        {
          title: "标题",
          datetime: "2025-01-01",
          channel: "test_channel",
          source: "BitSearch",
          metadata: { seeders: 42, sizeBytes: 1_500_000_000 },
          links: [
            { type: "aliyun", url: "https://a.com", password: "p1" },
          ],
        },
      ],
    };
    const result = extractMergedFromResponse(data);
    expect(result.aliyun).toHaveLength(1);
    expect(result.aliyun![0].url).toBe("https://a.com");
    expect(result.aliyun![0].note).toBe("标题");
    expect(result.aliyun![0].source).toBe("BitSearch");
    expect(result.aliyun![0].metadata?.seeders).toBe(42);
  });

  it("应正确解析 results 中的扁平 MergedLink 格式", () => {
    const data = {
      results: [
        { url: "https://x.com", password: "", note: "扁平", datetime: "", type: "others" },
      ],
    };
    const result = extractMergedFromResponse(data);
    expect(result.others).toHaveLength(1);
    expect(result.others![0].url).toBe("https://x.com");
    expect(result.others![0].note).toBe("扁平");
  });

  it("应正确解析 data.items 数组", () => {
    const data = {
      items: [
        { url: "https://i.com", password: "", note: "item", datetime: "" },
      ],
    };
    const result = extractMergedFromResponse(data);
    expect(result.others).toHaveLength(1);
    expect(result.others![0].url).toBe("https://i.com");
  });

  it("应正确解析 data 本身为数组", () => {
    const data = [
      { url: "https://arr.com", password: "", note: "arr", datetime: "" },
    ];
    const result = extractMergedFromResponse(data as any);
    expect(result.others).toHaveLength(1);
    expect(result.others![0].url).toBe("https://arr.com");
  });

  it("空 merged_by_type 应返回空对象", () => {
    const data = { merged_by_type: {} };
    expect(extractMergedFromResponse(data)).toEqual({});
  });
});
