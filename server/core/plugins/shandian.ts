import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";

const BASE = "http://1.95.79.193";
const SEARCH = (kw: string) =>
  `${BASE}/index.php/vod/search/wd/${encodeURIComponent(kw)}.html`;
const DETAIL = (id: string) => `${BASE}/index.php/vod/detail/id/${id}.html`;

const re = {
  id: /\/vod\/detail\/id\/(\d+)\.html/,
  uc: /https?:\/\/drive\.uc\.cn\/s\/[0-9a-zA-Z]+(?:\?[^"\s]*)?/g,
};

function collectUcLinks(html: string): SearchResult["links"] {
  const links: SearchResult["links"] = [];
  const m = html.match(re.uc) || [];
  for (const u of m)
    if (!links.some((l) => l.url === u))
      links.push({ type: "uc", url: u, password: "" });
  return links;
}

async function fetchDetailLinks(id: string) {
  try {
    const html = await ofetch<string>(DETAIL(id), {
      headers: { "user-agent": "Mozilla/5.0", referer: BASE + "/" },
      timeout: 8000,
    });
    const $ = load(html);
    const section = $("#download-list").html() || $("body").html() || "";
    return collectUcLinks(section);
  } catch {
    return [];
  }
}

export class ShandianPlugin extends BaseAsyncPlugin {
  constructor() {
    super("shandian", 2);
  }
  override async search(keyword: string): Promise<SearchResult[]> {
    const html = await ofetch<string>(SEARCH(keyword), {
      headers: { "user-agent": "Mozilla/5.0", referer: BASE + "/" },
      timeout: 8000,
    }).catch(() => "");
    if (!html) return [];
    const $ = load(html);
    const out: SearchResult[] = [];
    const tasks: Promise<any>[] = [];
    $(".module-search-item").each((_, el) => {
      const s = $(el);
      const a = s.find(".module-item-pic a").first();
      const href = a.attr("href") || "";
      const m = re.id.exec(href);
      if (!m) return;
      const id = m[1];
      const title = s.find(".video-info-header h3 a").first().text().trim();
      const quality = s.find(".video-serial").first().text().trim();
      const director = s
        .find(".video-info-items .video-info-itemtitle:contains(导演)")
        .siblings(".video-info-actor")
        .text()
        .trim();
      const plot = s
        .find(".video-info-items .video-info-itemtitle:contains(剧情)")
        .siblings(".video-info-item")
        .text()
        .trim();
      const content = [
        quality && `【${quality}】`,
        director && `导演：${director}`,
        plot,
      ]
        .filter(Boolean)
        .join("\n");
      tasks.push(
        (async () => {
          const links = await fetchDetailLinks(id);
          if (links.length) {
            out.push({
              message_id: "",
              unique_id: `shandian-${id}`,
              channel: "",
              datetime: "",
              title,
              content,
              links,
            });
          }
        })()
      );
    });
    await Promise.allSettled(tasks);
    return out;
  }
}

