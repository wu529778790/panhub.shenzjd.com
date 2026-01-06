import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";

const SEARCH = (kw: string) =>
  `https://susuifa.com/?type=post&s=${encodeURIComponent(kw)}`;
const BUTTON_DETAIL = (postId: string, i: number) =>
  `https://susuifa.com/wp-json/b2/v1/getDownloadPageData?post_id=${postId}&index=0&i=${i}&guest=`;

function decodeJWTURL(jwtToken: string): string {
  try {
    const parts = jwtToken.split(".");
    if (parts.length !== 3) return "";
    const payload = JSON.parse(
      Buffer.from(
        parts[1].replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      ).toString("utf8")
    );
    return payload?.data?.url || "";
  } catch {
    return "";
  }
}

function determineLinkType(url: string, name = ""): string {
  const u = url.toLowerCase();
  const n = name.toLowerCase();
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
  if (n.includes("百度")) return "baidu";
  if (n.includes("阿里")) return "aliyun";
  if (n.includes("迅雷")) return "xunlei";
  if (n.includes("夸克")) return "quark";
  if (n.includes("天翼")) return "tianyi";
  if (n.includes("uc")) return "uc";
  return "others";
}

async function fetchLinksForPost(
  postId: string
): Promise<SearchResult["links"]> {
  const out: SearchResult["links"] = [];
  const tasks = Array.from({ length: 6 }, (_, i) => i).map(async (i) => {
    try {
      const json = await ofetch<any>(BUTTON_DETAIL(postId, i), {
        method: "POST",
        headers: { "user-agent": "Mozilla/5.0" },
        timeout: 8000,
      });
      const jwtUrl: string = json?.button?.url || "";
      if (!jwtUrl) return;
      const real = decodeJWTURL(jwtUrl);
      if (!real) return;
      out.push({
        type: determineLinkType(real, json?.button?.name || ""),
        url: real,
        password: "",
      });
    } catch {}
  });
  await Promise.allSettled(tasks);
  return out;
}

export class SusuPlugin extends BaseAsyncPlugin {
  constructor() {
    super("susu", 1);
  }
  override async search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    const timeout = Math.max(
      3000,
      Number((ext as any)?.__plugin_timeout_ms) || 8000
    );
    const html = await ofetch<string>(SEARCH(keyword), {
      headers: { "user-agent": "Mozilla/5.0", referer: "https://susuifa.com/" },
      timeout,
    }).catch(() => "");
    if (!html) return [];
    const $ = load(html);
    const items: SearchResult[] = [];
    const nodes = $(".post-list-item");
    await Promise.all(
      nodes
        .map(async (i, el) => {
          const s = $(el);
          const title = s.find(".post-info h2 a").text().trim();
          const href = s.find(".post-info h2 a").attr("href") || "";
          let postId = "";
          const idAttr = s.attr("id") || "";
          if (idAttr.startsWith("item-")) postId = idAttr.replace("item-", "");
          if (!postId && href) {
            const m = href.match(/\/(\d+)\.html/);
            if (m) postId = m[1];
          }
          const content = s.find(".post-excerpt").text().trim();
          const timeStr =
            s.find(".list-footer time.b2timeago").attr("datetime") || "";
          const datetime = timeStr ? new Date(timeStr).toISOString() : "";
          const tags: string[] = [];
          s.find(".post-list-cat-item").each((_, t) => {
            const v = $(t).text().trim();
            if (v) tags.push(v);
          });
          let links: SearchResult["links"] = [];
          if (postId) {
            links = await fetchLinksForPost(postId);
          }
          items.push({
            message_id: "",
            unique_id: `susu-${postId || i}`,
            channel: "",
            datetime,
            title,
            content,
            links,
            tags,
          });
        })
        .get()
    );
    return items;
  }
}

