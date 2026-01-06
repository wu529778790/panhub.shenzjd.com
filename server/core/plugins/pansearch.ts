import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { fetchWithRetry } from "../utils/fetch";
import { createLogger } from "../utils/logger";

const logger = createLogger("pansearch");

// 轻量版：直接请求 pansearch 的 _next data 接口

type Item = { id: number; content: string; pan: string; time?: string };
type Resp = { pageProps: { data: { total: number; data: Item[] } } };

const WEBSITE = "https://www.pansearch.me/search";
const DATA = (buildId: string) =>
  `https://www.pansearch.me/_next/data/${buildId}/search.json`;

export class PansearchPlugin extends BaseAsyncPlugin {
  constructor() {
    super("pansearch", 3);
  }
  override async search(keyword: string): Promise<SearchResult[]> {
    const buildId = await getBuildId().catch(() => "");
    if (!buildId) return [];
    const url = `${DATA(buildId)}?keyword=${encodeURIComponent(
      keyword
    )}&offset=0`;
    const resp = await fetchWithRetry<Resp>(
      url,
      {
        headers: { "user-agent": "Mozilla/5.0" },
      },
      {
        maxRetries: 2,
        timeout: 8000,
        logWarnings: false,
      }
    ).catch(() => undefined);
    const items = resp?.pageProps?.data?.data || [];
    const out: SearchResult[] = [];
    for (const it of items) {
      const link = extractLink(it.content);
      if (!link.url) continue;
      out.push({
        message_id: "",
        unique_id: `pansearch-${it.id}`,
        channel: "",
        datetime: it.time || "",
        title: extractTitle(it.content, keyword),
        content: cleanHTML(it.content),
        links: [
          { type: mapType(link.url), url: link.url, password: link.password },
        ],
      });
    }
    return out;
  }
}

async function getBuildId(): Promise<string> {
  const html = await fetchWithRetry<string>(
    WEBSITE,
    {
      headers: { "user-agent": "Mozilla/5.0" },
    },
    {
      maxRetries: 2,
      timeout: 8000,
      logWarnings: false,
    }
  );
  const m = /"buildId":"([^"]+)"/.exec(html);
  if (m) return m[1];
  const m2 =
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s.exec(
      html
    );
  if (m2) {
    try {
      const data = JSON.parse(m2[1]);
      if (data?.buildId) return data.buildId;
    } catch {}
  }
  throw new Error("no buildId");
}

function extractLink(content: string): { url: string; password: string } {
  // 简单从 a 标签与 pwd 参数提取
  const mHref = /href=\"([^\"]+)\"/.exec(content);
  const url = mHref ? mHref[1] : "";
  let password = "";
  const mPwd = /[?&]pwd=([^"&#]+)/.exec(content);
  if (mPwd) password = mPwd[1];
  return { url, password };
}
function extractTitle(content: string, keyword: string): string {
  const m = /名称：([^<\n]+)/.exec(content);
  if (m) return cleanHTML(m[1]);
  return keyword;
}
function cleanHTML(html: string): string {
  return html
    .replace(/<span class='highlight-keyword'>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
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

