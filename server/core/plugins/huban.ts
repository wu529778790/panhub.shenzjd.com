import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";

type HubanItem = {
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
  vod_blurb?: string;
  vod_pic?: string;
};

type HubanResp = { code: number; msg: string; list: HubanItem[] };

const ENDPOINTS = [
  (kw: string) =>
    `http://xsayang.fun:12512/api.php/provide/vod?ac=detail&wd=${encodeURIComponent(
      kw
    )}`,
  (kw: string) =>
    `http://103.45.162.207:20720/api.php/provide/vod?ac=detail&wd=${encodeURIComponent(
      kw
    )}`,
];

function mapType(from: string): string {
  const f = String(from || "").toUpperCase();
  switch (f) {
    case "UCWP":
      return "uc";
    case "KKWP":
      return "quark";
    case "ALWP":
      return "aliyun";
    case "BDWP":
      return "baidu";
    case "123WP":
      return "123";
    case "115WP":
      return "115";
    case "TYWP":
      return "tianyi";
    case "XYWP":
      return "xunlei";
    case "WYWP":
      return "weiyun";
    case "LZWP":
      return "lanzou";
    case "JGYWP":
      return "jianguoyun";
    case "PKWP":
      return "pikpak";
    default:
      return "others";
  }
}

function extractPassword(url: string): string {
  const m = url.match(/[?&](?:pwd|password|passcode|code)=([0-9a-zA-Z]+)/);
  return m ? m[1] : "";
}

function parseLinks(vodDownFrom?: string, vodDownURL?: string) {
  if (!vodDownFrom || !vodDownURL) return [] as SearchResult["links"];
  const fromParts = vodDownFrom.split("$$$");
  const urlParts = vodDownURL.split("$$$");
  const links: SearchResult["links"] = [];
  const minLen = Math.min(fromParts.length, urlParts.length);
  for (let i = 0; i < minLen; i++) {
    const type = mapType(fromParts[i]);
    if (!type || type === "others") continue;
    let section = urlParts[i] || "";
    if (section.includes("$"))
      section = section.substring(section.indexOf("$") + 1);
    const parts = section.split("#");
    for (const p of parts) {
      const u = p.split("#")[0].trim();
      if (!u || !/^https?:|^magnet:|^ed2k:/.test(u)) continue;
      if (links.some((l) => l.url === u)) continue;
      links.push({ type, url: u, password: extractPassword(u) });
    }
  }
  return links;
}

export class HubanPlugin extends BaseAsyncPlugin {
  constructor() {
    super("huban", 2);
  }
  override async search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    const timeout = Math.max(
      3000,
      Number((ext as any)?.__plugin_timeout_ms) || 8000
    );
    for (let idx = 0; idx < ENDPOINTS.length; idx++) {
      const url = ENDPOINTS[idx](keyword);
      try {
        const resp = await ofetch<HubanResp>(url, {
          headers: { "user-agent": "Mozilla/5.0", accept: "application/json" },
          timeout,
        });
        if (!resp || resp.code !== 1) continue;
        const out: SearchResult[] = [];
        for (const it of resp.list || []) {
          const links = parseLinks(it.vod_down_from, it.vod_down_url);
          if (!links.length) continue;
          const tags: string[] = [];
          if (it.vod_year) tags.push(it.vod_year);
          const contentParts: string[] = [];
          if (it.vod_actor)
            contentParts.push(
              `主演: ${it.vod_actor.replace(/^,+|,+$/g, "").trim()}`
            );
          if (it.vod_director)
            contentParts.push(
              `导演: ${it.vod_director.replace(/^,+|,+$/g, "").trim()}`
            );
          if (it.vod_remarks) contentParts.push(`状态: ${it.vod_remarks}`);
          const content = contentParts.join(" | ");
          out.push({
            message_id: "",
            unique_id: `huban-${it.vod_id}`,
            channel: "",
            datetime: new Date().toISOString(),
            title: it.vod_name,
            content,
            links,
            tags,
          });
        }
        if (out.length) return out;
      } catch {
        if (idx === ENDPOINTS.length - 1) return [];
      }
    }
    return [];
  }
}

