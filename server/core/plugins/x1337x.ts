import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";

const BASE = "https://1337x.to";
const SEARCH_SORT = (kw: string, page = 1) =>
  `${BASE}/sort-search/${encodeURIComponent(kw)}/seeders/desc/${page}/`;
const SEARCH_BASIC = (kw: string, page = 1) =>
  `${BASE}/search/${encodeURIComponent(kw)}/${page}/`;

async function fetchHtmlWithFallback(url: string): Promise<string> {
  try {
    const html = await ofetch<string>(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        referer: BASE + "/",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 12000,
    });
    if (/Just a moment|Cloudflare|cf-browser-verification/i.test(html)) {
      const proxy = `https://r.jina.ai/http://${BASE.replace(
        /^https?:\/\//,
        ""
      )}${url.replace(/^https?:\/\//, "/")}`;
      return await ofetch<string>(proxy, {
        headers: { "user-agent": "Mozilla/5.0" },
        timeout: 12000,
      }).catch(() => "");
    }
    return html;
  } catch {
    const proxy = `https://r.jina.ai/http://${BASE.replace(
      /^https?:\/\//,
      ""
    )}${url.replace(/^https?:\/\//, "/")}`;
    return ofetch<string>(proxy, {
      headers: { "user-agent": "Mozilla/5.0" },
      timeout: 12000,
    }).catch(() => "");
  }
}

async function fetchDetailMagnet(detailUrl: string): Promise<string> {
  const html = await fetchHtmlWithFallback(detailUrl);
  if (!html) return "";
  const $ = load(html);
  return $("a[href^='magnet:']").attr("href") || "";
}

export class X1337xPlugin extends BaseAsyncPlugin {
  constructor() {
    super("1337x", 4);
  }

  override async search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    const timeout = Math.max(
      3000,
      Number((ext as any)?.__plugin_timeout_ms) || 10000
    );
    const queries: string[] = [keyword];
    if (/[^\x00-\x7F]/.test(keyword)) {
      // 中文或非 ASCII 关键词，补充英文同义词以提升命中
      queries.push("movie", "film", "1080p", "720p");
    }
    const out: SearchResult[] = [];
    for (const kw of queries) {
      if (out.length >= 12) break;
      let html = await fetchHtmlWithFallback(SEARCH_SORT(kw, 1));
      if (!html) html = await fetchHtmlWithFallback(SEARCH_BASIC(kw, 1));
      if (!html) continue;
      const $ = load(html);
      const tasks: Promise<void>[] = [];
      let count = out.length;
      $("table.table-list tbody tr").each((_, tr) => {
        if (count >= 12) return; // 限制最多 12 条详情抓取
        const row = $(tr);
        const titleA = row.find("td.coll-1 a:last").first();
        const title = (titleA.text() || "").trim();
        if (!title) return;
        const href = String(titleA.attr("href") || "");
        const detail = href.startsWith("/") ? `${BASE}${href}` : href;
        const unique = `1337x-${detail.split("/").pop()}`;
        count += 1;
        tasks.push(
          (async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout);
            const magnet = await fetchDetailMagnet(detail).finally(() =>
              clearTimeout(timer)
            );
            if (!magnet) return;
            out.push({
              message_id: "",
              unique_id: unique,
              channel: "",
              datetime: new Date().toISOString(),
              title,
              content: "",
              links: [{ type: "magnet", url: magnet, password: "" }],
            });
          })()
        );
      });
      if (tasks.length) await Promise.allSettled(tasks);
    }
    return out;
  }
}

