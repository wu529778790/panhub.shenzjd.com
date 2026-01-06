import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";

type Pan666Resp = {
  links: { next?: string };
  data: Array<{
    id: string;
    attributes: { title: string; createdAt: string };
    relationships: { mostRelevantPost: { data: { id: string } } };
  }>;
  included: Array<{
    id: string;
    attributes: { contentHtml: string; createdAt: string };
  }>;
};

const BASE = "https://pan666.net/api/discussions";

const reAnyLink =
  /https?:\/\/[^\s"'<>]+|magnet:\?[^\s"'<>]+|ed2k:\/\/[^\s"'<>]+/g;

function mapType(url: string): string {
  const u = url.toLowerCase();
  if (u.startsWith("magnet:")) return "magnet";
  if (u.startsWith("ed2k:")) return "ed2k";
  if (u.includes("pan.baidu.com")) return "baidu";
  if (u.includes("alipan.com") || u.includes("aliyundrive.com"))
    return "aliyun";
  if (u.includes("pan.quark.cn")) return "quark";
  if (u.includes("cloud.189.cn")) return "tianyi";
  if (u.includes("pan.xunlei.com")) return "xunlei";
  if (u.includes("caiyun") || u.includes("yun.139.com")) return "mobile";
  if (u.includes("115.com")) return "115";
  if (u.includes("123pan.com")) return "123";
  if (u.includes("drive.uc.cn")) return "uc";
  if (u.includes("mypikpak.com")) return "pikpak";
  if (u.includes("lanzou")) return "lanzou";
  return "others";
}

export class Pan666Plugin extends BaseAsyncPlugin {
  constructor() {
    super("pan666", 3);
  }
  override async search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    const timeout = Math.max(
      3000,
      Number((ext as any)?.__plugin_timeout_ms) || 8000
    );
    const url = `${BASE}?filter[q]=${encodeURIComponent(
      keyword
    )}&include=mostRelevantPost&page[offset]=0&page[limit]=50`;
    const resp = await ofetch<Pan666Resp>(url, {
      headers: { "user-agent": "Mozilla/5.0", accept: "application/json" },
      timeout,
    }).catch(() => undefined);
    if (!resp) return [];
    const postMap = new Map<
      string,
      { contentHtml: string; createdAt: string }
    >();
    for (const p of resp.included || [])
      postMap.set(p.id, {
        contentHtml: p.attributes.contentHtml,
        createdAt: p.attributes.createdAt,
      });
    const out: SearchResult[] = [];
    for (const d of resp.data || []) {
      const rel = d.relationships?.mostRelevantPost?.data?.id;
      const post = rel ? postMap.get(rel) : undefined;
      const html = post?.contentHtml || "";
      const links: SearchResult["links"] = [];
      for (const m of html.match(reAnyLink) || []) {
        if (!links.some((l) => l.url === m))
          links.push({ type: mapType(m), url: m, password: "" });
      }
      if (!links.length) continue;
      out.push({
        message_id: "",
        unique_id: `pan666-${d.id}`,
        channel: "",
        datetime: post?.createdAt || d.attributes.createdAt || "",
        title: d.attributes.title,
        content: "",
        links,
      });
    }
    return out;
  }
}

