import { describe, expect, it } from "vitest";
import { parsePlatformSearchIntent } from "../../utils/platformSearchIntent";

describe("parsePlatformSearchIntent", () => {
  it("识别无空格的 115 网盘搜索并保留真实关键词", () => {
    expect(parsePlatformSearchIntent("铁拳教育115网盘")).toEqual({
      keyword: "铁拳教育",
      platform: "115",
    });
  });

  it("识别常见网盘别名", () => {
    expect(parsePlatformSearchIntent("三体 阿里云盘")).toEqual({
      keyword: "三体",
      platform: "aliyun",
    });
    expect(parsePlatformSearchIntent("课程 UC网盘")).toEqual({
      keyword: "课程",
      platform: "uc",
    });
  });

  it("不把只有平台名称的搜索清空", () => {
    expect(parsePlatformSearchIntent("115网盘")).toEqual({
      keyword: "115网盘",
    });
  });

  it("多个平台同时出现时只清理导航词，不强制单选平台", () => {
    expect(parsePlatformSearchIntent("电影 百度网盘 夸克网盘")).toEqual({
      keyword: "电影",
      platform: undefined,
    });
  });

  it("普通关键词保持不变", () => {
    expect(parsePlatformSearchIntent("铁拳教育")).toEqual({
      keyword: "铁拳教育",
      platform: undefined,
    });
  });
});
