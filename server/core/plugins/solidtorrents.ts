import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";

type SolidItem = {
  title: string;
  magnet: string;
  size?: number;
  seeders?: number;
  leechers?: number;
  uploaded?: string;
  id?: string;
};

type SolidResp = {
  results: SolidItem[];
};

const API_PRIMARY = (kw: string) =>
  `https://solidtorrents.to/api/v1/search?q=${encodeURIComponent(
    kw
  )}&category=all&sort=seeders&limit=50`; // public JSON
const API_FALLBACK = (kw: string) =>
  `https://api.solidtorrents.net/v1/search?q=${encodeURIComponent(
    kw
  )}&category=all&sort=seeders&limit=50`;
const SEARCH_HTML = (kw: string) =>
  `https://solidtorrents.to/search?q=${encodeURIComponent(kw)}&sort=seeders`;

async function fetchHtmlWithFallback(url: string): Promise<string> {
  try {
    const html = await ofetch<string>(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        referer: "https://solidtorrents.to/",
      },
      timeout: 12000,
    });
    if (
      !html ||
      /Just a moment|Cloudflare|cf-browser-verification/i.test(html)
    ) {
      // 使用只读代理抓取静态内容
      const proxyUrl = `https://r.jina.ai/http://solidtorrents.to${url.replace(
        /^https?:\/\/solidtorrents\.to/,
        ""
      )}`;
      return await ofetch<string>(proxyUrl, {
        headers: { "user-agent": "Mozilla/5.0" },
        timeout: 12000,
      }).catch(() => "");
    }
    return html;
  } catch {
    // 直接走只读代理
    const proxyUrl = `https://r.jina.ai/http://solidtorrents.to${url.replace(
      /^https?:\/\/solidtorrents\.to/,
      ""
    )}`;
    return ofetch<string>(proxyUrl, {
      headers: { "user-agent": "Mozilla/5.0" },
      timeout: 12000,
    }).catch(() => "");
  }
}

async function fetchDetailMagnet(detailUrl: string): Promise<string> {
  const html = await fetchHtmlWithFallback(detailUrl);
  if (!html) return "";
  const $ = load(html);
  let magnet = $("a[href^='magnet:']").attr("href") || "";
  if (!magnet)
    magnet =
      $("[data-clipboard-text^='magnet:']").attr("data-clipboard-text") || "";
  return magnet || "";
}

export class SolidTorrentsPlugin extends BaseAsyncPlugin {
  constructor() {
    super("solidtorrents", 4);
  }

  override async search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    const timeoutMs = Math.max(
      3000,
      Number((ext as any)?.__plugin_timeout_ms) || 10000
    );
    const queries: string[] = [keyword];
    if (/[^\x00-\x7F]/.test(keyword)) queries.push("movie", "1080p");
    let items: SolidItem[] = [];
    for (const kw of queries) {
      if (items.length > 0) break;
      let resp = await ofetch<SolidResp>(API_PRIMARY(kw), {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          accept: "application/json",
          referer: "https://solidtorrents.to/",
        },
        timeout: timeoutMs,
      }).catch(() => undefined);
      if (!resp) {
        resp = await ofetch<SolidResp>(API_FALLBACK(kw), {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            accept: "application/json",
            referer: "https://solidtorrents.to/",
          },
          timeout: timeoutMs,
        }).catch(() => ({ results: [] }));
      }
      items = Array.isArray(resp?.results) ? resp!.results : [];
      // HTML 兜底：API 无结果或被屏蔽时，直接解析搜索页
      if (!items.length) {
        const html = await fetchHtmlWithFallback(SEARCH_HTML(kw));
        if (html) {
          const $ = load(html);
          const htmlItems: SolidItem[] = [];
          const tasks: Promise<void>[] = [];
          let detailFetches = 0;
          $("a[href^='/view/']").each((_, a) => {
            const titleA = $(a);
            const title = (titleA.text() || "").trim();
            const href = String(titleA.attr("href") || "");
            const detail = href.startsWith("/")
              ? `https://solidtorrents.to${href}`
              : href;
            const container = titleA.closest("li, article, div");
            let magnet =
              container.find("a[href^='magnet:']").attr("href") || "";
            if (!magnet)
              magnet =
                container
                  .find("[data-clipboard-text^='magnet:']")
                  .attr("data-clipboard-text") || "";
            if (title && magnet) {
              htmlItems.push({ title, magnet, id: detail.split("/").pop() });
            } else if (title && detail && detailFetches < 10) {
              detailFetches += 1;
              tasks.push(
                (async () => {
                  const mg = await fetchDetailMagnet(detail);
                  if (mg)
                    htmlItems.push({
                      title,
                      magnet: mg,
                      id: detail.split("/").pop(),
                    });
                })()
              );
            }
          });
          if (tasks.length) await Promise.allSettled(tasks);
          items = htmlItems;
        }
      }
    }
    const out: SearchResult[] = [];
    for (const it of items) {
      const magnet = it.magnet || "";
      if (!magnet) continue;
      const title = (it.title || "").trim();
      if (!title) continue;
      const unique = `solid-${it.id || title}`;
      const parts: string[] = [];
      if (typeof it.size === "number" && it.size > 0)
        parts.push(`Size: ${formatBytes(it.size)}`);
      if (typeof it.seeders === "number") parts.push(`Seeders: ${it.seeders}`);
      if (typeof it.leechers === "number")
        parts.push(`Leechers: ${it.leechers}`);
      if (it.uploaded) parts.push(`Uploaded: ${it.uploaded}`);
      out.push({
        message_id: "",
        unique_id: unique,
        channel: "",
        datetime: "",
        title,
        content: parts.join(" | "),
        links: [{ type: "magnet", url: magnet, password: "" }],
      });
    }
    return out;
  }
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

