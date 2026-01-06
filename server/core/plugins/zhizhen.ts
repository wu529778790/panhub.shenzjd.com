import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";

type ApiItem = {
  vod_id: number;
  vod_name: string;
  vod_actor?: string;
  vod_director?: string;
  vod_down_from?: string;
  vod_down_url?: string;
  vod_remarks?: string;
  vod_pubdate?: string;
  vod_area?: string;
  vod_lang?: string;
  vod_year?: string;
  vod_content?: string;
  vod_pic?: string;
};

type ApiResponse = {
  code: number;
  msg: string;
  page: number;
  pagecount: number;
  limit: number;
  total: number;
  list: ApiItem[];
};

const PWD_RE = /\?pwd=([0-9a-zA-Z]+)/;

function mapCloudTypeZhizhen(apiType: string, url: string): string {
  const upper = (apiType || "").toUpperCase();
  switch (upper) {
    case "KUAKE":
      return "quark";
    case "BAIDUI":
      return "baidu";
    case "UC":
      return "uc";
    case "ALY":
      return "aliyun";
    case "XL":
      return "xunlei";
    case "TY":
      return "tianyi";
    case "115":
      return "115";
    case "MB":
      return "mobile";
    case "WY":
      return "weiyun";
    case "LZ":
      return "lanzou";
    case "JGY":
      return "jianguoyun";
    case "123":
      return "123";
    case "PK":
      return "pikpak";
    default:
      return determineLinkType(url);
  }
}

function determineLinkType(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("pan.quark.cn/s/")) return "quark";
  if (u.includes("drive.uc.cn/s/")) return "uc";
  if (u.includes("pan.baidu.com/s/")) return "baidu";
  if (u.includes("aliyundrive.com/s/") || u.includes("alipan.com/s/"))
    return "aliyun";
  if (u.includes("pan.xunlei.com/s/")) return "xunlei";
  if (u.includes("cloud.189.cn/t/")) return "tianyi";
  if (u.includes("115.com/s/")) return "115";
  if (u.includes("feixin.10086.cn") || u.includes("yun.139.com") || u.includes("caiyun.139.com")) return "mobile";
  if (u.includes("share.weiyun.com")) return "weiyun";
  if (u.includes("lanzou") || u.includes("lanzo")) return "lanzou";
  if (u.includes("jianguoyun.com/p/")) return "jianguoyun";
  if (u.includes("123pan.com/s/")) return "123";
  if (u.includes("mypikpak.com/s/")) return "pikpak";
  if (u.startsWith("magnet:")) return "magnet";
  if (u.startsWith("ed2k://")) return "ed2k";
  return "";
}

const ZHIZHEN_BASES = [
  "https://xiaomi666.fun",
  "https://cn.xiaomi666.fun",
  "https://api.xiaomi666.fun",
];

export class ZhizhenPlugin extends BaseAsyncPlugin {
  constructor() {
    super("zhizhen", 1);
  }

  override async search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    const timeout = Math.max(
      3000,
      Number((ext as any)?.__plugin_timeout_ms) || 8000
    );
    const queries: string[] = [keyword];
    if ((keyword || "").trim().length <= 1)
      queries.push("电影", "movie", "1080p");

    for (const kw of queries) {
      const tasks = ZHIZHEN_BASES.map((base) =>
        ofetch<ApiResponse>(
          `${base}/api.php/provide/vod?ac=detail&wd=${encodeURIComponent(
            kw
          )}` as string,
          {
            headers: {
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
              accept: "application/json, text/plain, */*",
              "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
              referer: `${base}/`,
            },
            timeout,
          }
        ).catch(() => ({
          code: -1,
          msg: "error",
          page: 0,
          pagecount: 0,
          limit: 0,
          total: 0,
          list: [],
        }))
      );
      const results = await Promise.all(tasks);
      const merged: ApiItem[] = [];
      for (const r of results)
        if (r && r.code === 1 && Array.isArray(r.list)) merged.push(...r.list);
      if (!merged.length) continue;
      const out: SearchResult[] = [];
      for (const item of merged) {
        const links = parseLinks(
          item.vod_down_from || "",
          item.vod_down_url || "",
          mapCloudTypeZhizhen
        );
        if (!links.length) continue;
        const contentParts: string[] = [];
        if (item.vod_actor) contentParts.push(`主演: ${item.vod_actor}`);
        if (item.vod_director) contentParts.push(`导演: ${item.vod_director}`);
        if (item.vod_area) contentParts.push(`地区: ${item.vod_area}`);
        if (item.vod_lang) contentParts.push(`语言: ${item.vod_lang}`);
        if (item.vod_year) contentParts.push(`年份: ${item.vod_year}`);
        if (item.vod_remarks) contentParts.push(`状态: ${item.vod_remarks}`);
        out.push({
          message_id: "",
          unique_id: `zhizhen-${item.vod_id}`,
          channel: "",
          datetime: new Date().toISOString(),
          title: (item.vod_name || "").trim(),
          content: contentParts.join(" | "),
          links,
          tags: [item.vod_year || "", item.vod_area || ""].filter(Boolean),
        });
      }
      if (out.length) return out;
    }
    return [];
  }
}

function parseLinks(
  fromStr: string,
  urlStr: string,
  mapper: (apiType: string, url: string) => string
) {
  const fromParts = (fromStr || "").split("$$$");
  const urlParts = (urlStr || "").split("$$$");
  const min = Math.min(fromParts.length, urlParts.length);
  const links: SearchResult["links"] = [];
  for (let i = 0; i < min; i += 1) {
    const apiType = (fromParts[i] || "").trim();
    const u = (urlParts[i] || "").trim();
    if (!u) continue;
    const type = mapper(apiType, u);
    if (!type) continue;
    const m = u.match(PWD_RE);
    const password = m ? m[1] : "";
    links.push({ type, url: u, password });
  }
  return links;
}

