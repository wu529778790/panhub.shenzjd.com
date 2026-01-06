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
  vod_year?: string;
};

type ApiResponse = { code: number; msg: string; list: ApiItem[] };

const PWD_RE = /\?pwd=([0-9a-zA-Z]+)/;

function mapCloudType(apiType: string, url: string): string {
  const upper = (apiType || "").toUpperCase();
  switch (upper) {
    case "BD":
      return "baidu";
    case "KG":
      return "quark";
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

function parseLinks(fromStr: string, urlStr: string) {
  const fromParts = (fromStr || "").split("$$$");
  const urlParts = (urlStr || "").split("$$$");
  const min = Math.min(fromParts.length, urlParts.length);
  const links: SearchResult["links"] = [];
  for (let i = 0; i < min; i += 1) {
    const apiType = (fromParts[i] || "").trim();
    const u = (urlParts[i] || "").trim();
    if (!u) continue;
    const type = mapCloudType(apiType, u);
    if (!type) continue;
    const m = u.match(PWD_RE);
    const password = m ? m[1] : "";
    links.push({ type, url: u, password });
  }
  return links;
}

const OUGE_BASES = [
  "https://woog.nxog.eu.org",
  "https://ouge.nxog.eu.org",
  "https://api.nxog.eu.org",
];

export class OugePlugin extends BaseAsyncPlugin {
  constructor() {
    super("ouge", 2);
  }
  override async search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    const timeout = Math.max(
      3000,
      Number((ext as any)?.__plugin_timeout_ms) || 8000
    );
    const queries = [(keyword || "").trim()].filter(Boolean);
    if (queries[0]?.length <= 1) queries.push("电影", "movie", "1080p");

    for (const kw of queries) {
      const tasks = OUGE_BASES.map((base) =>
        ofetch<ApiResponse>(
          `${base}/api.php/provide/vod?ac=detail&wd=${encodeURIComponent(
            kw
          )}` as string,
          {
            headers: {
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
              accept: "application/json, text/plain, */*",
              referer: `${base}/`,
            },
            timeout,
          }
        ).catch(() => ({ code: -1, msg: "error", list: [] }))
      );
      const resps = await Promise.all(tasks);
      const list: ApiItem[] = [];
      for (const r of resps)
        if (r && r.code === 1 && Array.isArray(r.list)) list.push(...r.list);
      if (!list.length) continue;
      const out: SearchResult[] = [];
      for (const item of list) {
        const links = parseLinks(
          item.vod_down_from || "",
          item.vod_down_url || ""
        );
        if (!links.length) continue;
        out.push({
          message_id: "",
          unique_id: `ouge-${item.vod_id}`,
          channel: "",
          datetime: new Date().toISOString(),
          title: (item.vod_name || "").trim(),
          content: [
            item.vod_actor && `主演: ${item.vod_actor}`,
            item.vod_director && `导演: ${item.vod_director}`,
            item.vod_area && `地区: ${item.vod_area}`,
            item.vod_year && `年份: ${item.vod_year}`,
          ]
            .filter(Boolean)
            .join(" | "),
          links,
          tags: [item.vod_year || "", item.vod_area || ""].filter(Boolean),
        });
      }
      if (out.length) return out;
    }
    return [];
  }
}

