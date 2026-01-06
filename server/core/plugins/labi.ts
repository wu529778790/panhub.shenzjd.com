import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";

const SEARCH_URL = (kw: string) =>
  `http://xiaocge.fun/index.php/vod/search/wd/${encodeURIComponent(kw)}.html`;
const DETAIL_URL = (id: string) =>
  `http://xiaocge.fun/index.php/vod/detail/id/${id}.html`;

function isQuark(url: string) {
  return /https?:\/\/pan\.quark\.cn\/s\//i.test(url);
}

export class LabiPlugin extends BaseAsyncPlugin {
  constructor() {
    super("labi", 1);
  }
  override async search(keyword: string): Promise<SearchResult[]> {
    const html = await ofetch<string>(SEARCH_URL(keyword), {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        referer: "http://xiaocge.fun/",
      },
      timeout: 8000,
    }).catch(() => "");
    if (!html) return [];
    const $ = load(html);
    const results: SearchResult[] = [];
    const items = $(".module-search-item");
    const tasks = items
      .map(async (_, el) => {
        const s = $(el);
        const a = s.find(".module-item-pic a").first();
        const href = a.attr("href") || "";
        const idMatch = href.match(/\/vod\/detail\/id\/(\d+)\.html/);
        if (!idMatch) return;
        const id = idMatch[1];
        const title = s.find(".video-info-header h3 a").text().trim();
        const contentPieces: string[] = [];
        const quality = s.find(".video-serial").text().trim();
        if (quality) contentPieces.push(`【${quality}】`);
        const plot = s.find(".video-info-items .video-info-item").text().trim();
        if (plot) contentPieces.push(plot);
        const detail = await ofetch<string>(DETAIL_URL(id), {
          headers: {
            "user-agent": "Mozilla/5.0",
            referer: "http://xiaocge.fun/",
          },
          timeout: 6000,
        }).catch(() => "");
        let links: SearchResult["links"] = [];
        if (detail) {
          const $$ = load(detail);
          const found = new Set<string>();
          $$(
            "#download-list .module-row-one [data-clipboard-text], #download-list .module-row-one a[href]"
          ).each((_, a2) => {
            const u =
              $$(a2).attr("data-clipboard-text") || $$(a2).attr("href") || "";
            if (!u || !isQuark(u) || found.has(u)) return;
            found.add(u);
            links.push({ type: "quark", url: u, password: "" });
          });
        }
        results.push({
          message_id: "",
          unique_id: `labi-${id}`,
          channel: "",
          datetime: "",
          title,
          content: contentPieces.join("\n"),
          links,
        });
      })
      .get();
    await Promise.allSettled(tasks);
    return results;
  }
}

