import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";
import { fetchWithRetry } from "../utils/fetch";
import { createLogger } from "../utils/logger";

const logger = createLogger("duoduo");

const BASE = "https://tv.yydsys.top";
const SEARCH = (kw: string) =>
  `${BASE}/index.php/vod/search/wd/${encodeURIComponent(kw)}.html`;

const re = {
  magnet: /magnet:\?xt=urn:btih:[0-9a-fA-F]{40}[^"'\s]*/g,
  ed2k: /ed2k:\/\/\|file\|.+\|\d+\|[0-9a-fA-F]{32}\|\//g,
  pan: {
    baidu:
      /https?:\/\/pan\.baidu\.com\/s\/[0-9a-zA-Z_-]+(?:\?pwd=[0-9a-zA-Z]+)?/g,
    aliyun:
      /https?:\/\/(?:www\.)?(?:aliyundrive\.com|alipan\.com)\/s\/[0-9a-zA-Z_-]+/g,
    tianyi: /https?:\/\/cloud\.189\.cn\/t\/[0-9a-zA-Z_-]+/g,
    uc: /https?:\/\/drive\.uc\.cn\/s\/[0-9a-fA-F]+(?:\?[^"\s]*)?/g,
    mobile: /https?:\/\/(?:caiyun\.139|caiyun\.feixin\.10086|yun\.139)\.com\/[^"\s]+/g,
    oneonefive: /https?:\/\/(?:115\.com|115cdn\.com)\/s\/[0-9a-zA-Z_-]+/g,
    pikpak: /https?:\/\/mypikpak\.com\/s\/[0-9a-zA-Z_-]+/g,
    xunlei:
      /https?:\/\/pan\.xunlei\.com\/s\/[0-9a-zA-Z_-]+(?:\?pwd=[0-9a-zA-Z]+)?/g,
    _123: /https?:\/\/(?:www\.)?123pan\.com\/s\/[0-9a-zA-Z_-]+/g,
    lanzou: /https?:\/\/(?:www\.)?(?:lanzou|lanzo)[^\s]+/g,
  },
};

function collectLinks(html: string): SearchResult["links"] {
  const links: SearchResult["links"] = [];
  const add = (url: string, type: string) => {
    if (!url) return;
    if (links.some((l) => l.url === url)) return;
    links.push({ type, url, password: "" });
  };
  for (const m of html.match(re.magnet) || []) add(m, "magnet");
  for (const m of html.match(re.ed2k) || []) add(m, "ed2k");
  for (const [type, rg] of Object.entries(re.pan))
    for (const m of html.match(rg as RegExp) || []) add(m, type);
  return links;
}

async function fetchDetail(url: string) {
  const html = await fetchWithRetry<string>(
    url,
    {
      headers: { "user-agent": "Mozilla/5.0", referer: BASE + "/" },
    },
    {
      maxRetries: 2,
      timeout: 10000,
      logWarnings: false,
    }
  ).catch(() => "");
  if (!html) return [];
  const $ = load(html);
  const text = $("#download-list").html() || $("body").html() || "";
  return collectLinks(text);
}

export class DuoduoPlugin extends BaseAsyncPlugin {
  constructor() {
    super("duoduo", 2);
  }
  override async search(keyword: string): Promise<SearchResult[]> {
    const html = await fetchWithRetry<string>(
      SEARCH(keyword),
      {
        headers: { "user-agent": "Mozilla/5.0", referer: BASE + "/" },
      },
      {
        maxRetries: 2,
        timeout: 10000,
        logWarnings: false,
      }
    ).catch(() => "");
    if (!html) return [];
    const $ = load(html);
    const out: SearchResult[] = [];
    const tasks: Promise<any>[] = [];
    $(".module-search-item").each((_, el) => {
      const s = $(el);
      const a = s.find(".video-info-header h3 a").first();
      const href = a.attr("href") || "";
      const title = a.text().trim();
      if (!href || !title) return;
      const detail = href.startsWith("/") ? `${BASE}${href}` : href;
      tasks.push(
        (async () => {
          const links = await fetchDetail(detail);
          if (links.length) {
            out.push({
              message_id: "",
              unique_id: `duoduo-${detail}`,
              channel: "",
              datetime: "",
              title,
              content: "",
              links,
            });
          }
        })()
      );
    });
    // 使用 Promise.allSettled 并行获取所有详情
    await Promise.allSettled(tasks);
    return out;
  }
}

