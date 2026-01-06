import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";

const BASE = "https://torrentgalaxy.to";
const SEARCH = (kw: string, page = 1) =>
  `${BASE}/torrents.php?search=${encodeURIComponent(
    kw
  )}&sort=seeders&order=desc&page=${page}`;

async function fetchHtmlWithFallback(url: string): Promise<string> {
  try {
    const html = await ofetch<string>(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        referer: BASE + "/",
      },
      timeout: 12000,
    });
    if (/Cloudflare|Just a moment/i.test(html)) {
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

export class TorrentGalaxyPlugin extends BaseAsyncPlugin {
  constructor() {
    super("torrentgalaxy", 4);
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
    if (/[^\x00-\x7F]/.test(keyword)) queries.push("movie", "1080p");
    const out: SearchResult[] = [];
    for (const kw of queries) {
      if (out.length >= 12) break;
      const html = await fetchHtmlWithFallback(SEARCH(kw, 1));
      if (!html) continue;
      const $ = load(html);
      const tasks: Promise<void>[] = [];
      let details = out.length;
      $("a.txlight").each((_, a) => {
        if (details >= 12) return;
        const titleA = $(a);
        const title = (titleA.text() || "").trim();
        if (!title) return;
        const href = String(titleA.attr("href") || "");
        if (!href || !href.includes("/torrent/")) return;
        const detail = href.startsWith("/") ? `${BASE}${href}` : href;
        const unique = `tgx-${detail.split("/").pop()}`;
        details += 1;
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

