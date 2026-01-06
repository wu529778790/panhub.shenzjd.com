import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";
import { fetchWithRetry } from "../utils/fetch";
import { createLogger } from "../utils/logger";

const logger = createLogger("panta");

const SEARCH_URL = (kw: string) =>
  `https://www.91panta.cn/search?keyword=${encodeURIComponent(kw)}`;

function determineLinkType(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("pan.baidu.com")) return "baidu";
  if (u.includes("alipan.com") || u.includes("aliyundrive.com"))
    return "aliyun";
  if (u.includes("pan.xunlei.com")) return "xunlei";
  if (u.includes("pan.quark.cn")) return "quark";
  if (u.includes("cloud.189.cn")) return "tianyi";
  if (u.includes("115.com")) return "115";
  if (u.includes("drive.uc.cn")) return "uc";
  if (u.includes("caiyun.139.com") || u.includes("yun.139.com")) return "mobile";
  if (u.includes("share.weiyun.com")) return "weiyun";
  if (u.includes("lanzou")) return "lanzou";
  if (u.includes("jianguoyun.com")) return "jianguoyun";
  if (u.includes("123pan.com")) return "123";
  if (u.includes("mypikpak.com")) return "pikpak";
  return "others";
}

export class PantaPlugin extends BaseAsyncPlugin {
  constructor() {
    super("panta", 1);
  }
  override async search(keyword: string): Promise<SearchResult[]> {
    const html = await fetchWithRetry<string>(
      SEARCH_URL(keyword),
      {
        headers: {
          "user-agent": "Mozilla/5.0",
          referer: "https://www.91panta.cn/index",
        },
      },
      {
        maxRetries: 2,
        timeout: 8000,
        logWarnings: false,
      }
    ).catch(() => "");
    if (!html) return [];
    const $ = load(html);
    const results: SearchResult[] = [];
    const topics = $("div.topicItem");
    const tasks = topics
      .map(async (_, el) => {
        const s = $(el);
        const a = s.find("a[href^='thread?topicId=']");
        const href = a.attr("href") || "";
        const m = href.match(/topicId=(\d+)/);
        if (!m) return;
        const topicId = m[1];
        const title = a.text().trim();
        const summary = s.find("h2.summary").text().trim();
        const timeText = s.find("span.postTime").text();
        const dtMatch = timeText.match(/发表时间：(.+)/);
        const datetime = dtMatch ? new Date(dtMatch[1]).toISOString() : "";
        // 抓详情 - 使用 fetchWithRetry 和并行处理
        const detailUrl = `https://www.91panta.cn/thread?topicId=${topicId}`;
        const detail = await fetchWithRetry<string>(
          detailUrl,
          {
            headers: {
              "user-agent": "Mozilla/5.0",
              referer: "https://www.91panta.cn/index",
            },
          },
          {
            maxRetries: 2,
            timeout: 8000,
            logWarnings: false,
          }
        ).catch(() => "");
        if (!detail) return;
        const $$ = load(detail);
        const found = new Set<string>();
        const links: SearchResult["links"] = [];
        $$('.topicContent a[href^="http"]').each((_, a2) => {
          const u = $$(a2).attr("href") || "";
          if (!u || found.has(u)) return;
          found.add(u);
          links.push({ type: determineLinkType(u), url: u, password: "" });
        });
        if (links.length) {
          results.push({
            message_id: "",
            unique_id: `panta-${topicId}`,
            channel: "",
            datetime,
            title,
            content: summary,
            links,
            tags: ["panta"],
          });
        }
      })
      .get();
    await Promise.allSettled(tasks);
    return results;
  }
}

