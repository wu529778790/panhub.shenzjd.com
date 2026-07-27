import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { fetchWithRetry } from "../utils/fetch";

// 轻量版：直接请求 pansearch 的 _next data 接口

type Item = { id: number; content: string; pan: string; time?: string };
type Resp = { pageProps: { data: { total: number; data: Item[] } } };

const WEBSITE = "https://www.pansearch.me/search";
const DATA = (buildId: string) =>
  `https://www.pansearch.me/_next/data/${buildId}/search.json`;
const PAGE_OFFSET_STEP = 10;
const MAX_PAGES = 10;

export class PansearchPlugin extends BaseAsyncPlugin {
  constructor() {
    super("pansearch", 3);
  }
  override async search(
    keyword: string,
    ext: Record<string, any> = {}
  ): Promise<SearchResult[]> {
    const signal = ext.signal as AbortSignal | undefined;
    const buildId = await getBuildId(signal).catch(() => "");
    if (!buildId) return [];

    const fetchPage = (offset: number) =>
      fetchWithRetry<Resp>(
        `${DATA(buildId)}?keyword=${encodeURIComponent(keyword)}&offset=${offset}`,
        {
          headers: { "user-agent": "Mozilla/5.0" },
          signal,
        },
        {
          maxRetries: offset === 0 ? 1 : 0,
          timeout: 6500,
          logWarnings: false,
          signal,
        }
      ).catch(() => undefined);

    const firstPage = await fetchPage(0);
    if (!firstPage) return [];

    const total = Math.max(0, Number(firstPage.pageProps?.data?.total || 0));
    const pageCount = Math.min(
      MAX_PAGES,
      Math.max(1, Math.ceil(total / PAGE_OFFSET_STEP))
    );
    const remainingPages = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) =>
        fetchPage((index + 1) * PAGE_OFFSET_STEP)
      )
    );
    const items = [firstPage, ...remainingPages]
      .flatMap((resp) => resp?.pageProps?.data?.data || []);

    // 同一个分享链接会在源站重复出现，保留最新记录即可。
    const byUrl = new Map<string, SearchResult>();
    for (const it of items) {
      const link = extractLink(it.content);
      if (!link.url) continue;
      const result: SearchResult = {
        message_id: "",
        unique_id: `pansearch-${it.id}`,
        channel: "",
        datetime: it.time || "",
        title: extractTitle(it.content, keyword),
        content: cleanHTML(it.content),
        links: [
          { type: mapType(link.url), url: link.url, password: link.password },
        ],
      };
      if (!byUrl.has(link.url)) byUrl.set(link.url, result);
    }
    return Array.from(byUrl.values());
  }
}

// buildId 是 Next.js 构建产物 ID，变化频率以天/部署计，缓存 1 小时避免每次搜索都重抓首页
let cachedBuildId: { value: string; expires: number } | null = null;
const BUILD_ID_TTL = 3600_000; // 1 小时

async function getBuildId(signal?: AbortSignal): Promise<string> {
  if (cachedBuildId && Date.now() < cachedBuildId.expires) {
    return cachedBuildId.value;
  }

  const html = await fetchWithRetry<string>(
    WEBSITE,
    {
      headers: { "user-agent": "Mozilla/5.0" },
      signal,
    },
    {
      maxRetries: 2,
      timeout: 8000,
      logWarnings: false,
      signal,
    }
  );
  const m = /"buildId":"([^"]+)"/.exec(html);
  if (m) {
    cachedBuildId = { value: m[1], expires: Date.now() + BUILD_ID_TTL };
    return m[1];
  }
  const m2 =
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s.exec(
      html
    );
  if (m2) {
    try {
      const data = JSON.parse(m2[1]);
      if (data?.buildId) {
        cachedBuildId = { value: data.buildId, expires: Date.now() + BUILD_ID_TTL };
        return data.buildId;
      }
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
