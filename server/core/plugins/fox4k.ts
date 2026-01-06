import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";

const BASE = "https://4kfox.com";
const SEARCH = (kw: string, page = 1) =>
  page === 1
    ? `${BASE}/search/${encodeURIComponent(kw)}-------------.html`
    : `${BASE}/search/${encodeURIComponent(kw)}----------${page}---.html`;

const re = {
  magnet: /magnet:\?xt=urn:btih:[0-9a-fA-F]{40}[^"'\s]*/g,
  ed2k: /ed2k:\/\/\|file\|[^|]+\|[^|]+\|[^|]+\|\/?/g,
  pan: {
    baidu:
      /https?:\/\/pan\.baidu\.com\/s\/[0-9a-zA-Z_-]+(?:\?pwd=[0-9a-zA-Z]+)?/g,
    aliyun:
      /https?:\/\/(?:www\.)?(?:aliyundrive\.com|alipan\.com)\/s\/[0-9a-zA-Z_-]+/g,
    tianyi: /https?:\/\/cloud\.189\.cn\/t\/[0-9a-zA-Z_-]+/g,
    uc: /https?:\/\/drive\.uc\.cn\/s\/[0-9a-fA-F]+(?:\?[^"\s]*)?/g,
    mobile: /https?:\/\/(?:caiyun\.139|yun\.139)\.com\/[^"\s]+/g,
    oneonefive: /https?:\/\/115\.com\/s\/[0-9a-zA-Z_-]+/g,
    pikpak: /https?:\/\/mypikpak\.com\/s\/[0-9a-zA-Z_-]+/g,
    xunlei:
      /https?:\/\/pan\.xunlei\.com\/s\/[0-9a-zA-Z_-]+(?:\?pwd=[0-9a-zA-Z]+)?/g,
    _123: /https?:\/\/(?:www\.)?123pan\.com\/s\/[0-9a-zA-Z_-]+/g,
    lanzou: /https?:\/\/(?:www\.)?(?:lanzou|lanzo)[^\s]+/g,
  },
  quark: /https?:\/\/pan\.quark\.cn\/s\/[0-9a-fA-F]+(?:\?pwd=[0-9a-zA-Z]+)?/g,
};

function add(
  out: SearchResult["links"],
  type: string,
  url: string,
  password = ""
) {
  if (!url) return;
  if (re.quark.test(url)) return;
  if (out.some((l) => l.url === url)) return;
  out.push({ type, url, password });
}

function extractAllLinks(html: string): SearchResult["links"] {
  const links: SearchResult["links"] = [];
  const addAll = (rg: RegExp, type: string) => {
    const m = html.match(rg);
    if (m) for (const u of m) add(links, type, u);
  };
  addAll(re.magnet, "magnet");
  addAll(re.ed2k, "ed2k");
  addAll(re.pan.baidu, "baidu");
  addAll(re.pan.aliyun, "aliyun");
  addAll(re.pan.tianyi, "tianyi");
  addAll(re.pan.uc, "uc");
  addAll(re.pan.mobile, "mobile");
  addAll(re.pan.oneonefive, "115");
  addAll(re.pan.pikpak, "pikpak");
  addAll(re.pan.xunlei, "xunlei");
  addAll(re.pan._123, "123");
  addAll(re.pan.lanzou, "lanzou");
  return links;
}

async function fetchDetailLinks(
  detailUrl: string,
  timeout: number
): Promise<SearchResult["links"]> {
  try {
    let html = await ofetch<string>(detailUrl, {
      headers: { "user-agent": "Mozilla/5.0", referer: BASE + "/" },
      timeout,
    }).catch(() => "");
    if (!html || /Just a moment|Cloudflare|Access denied/i.test(html)) {
      const proxy = `https://r.jina.ai/${detailUrl.replace(
        /^https?:\/\//,
        ""
      )}`;
      html = await ofetch<string>(proxy, {
        headers: { "user-agent": "Mozilla/5.0" },
        timeout,
      }).catch(() => "");
    }
    if (!html) return [];
    const $ = load(html);
    const pageText = $.text() + "\n" + ($("body").html() || "");
    return extractAllLinks(pageText || "");
  } catch {
    return [];
  }
}

export class Fox4kPlugin extends BaseAsyncPlugin {
  constructor() {
    super("fox4k", 3);
  }
  override async search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    const timeout = Math.max(
      3000,
      Number((ext as any)?.__plugin_timeout_ms) || 10000
    );
    let html = await ofetch<string>(SEARCH(keyword, 1), {
      headers: { "user-agent": "Mozilla/5.0", referer: BASE + "/" },
      timeout,
    }).catch(() => "");
    if (!html || /Just a moment|Cloudflare|Access denied/i.test(html)) {
      const proxy = `https://r.jina.ai/${SEARCH(keyword, 1).replace(
        /^https?:\/\//,
        ""
      )}`;
      html = await ofetch<string>(proxy, {
        headers: { "user-agent": "Mozilla/5.0" },
        timeout,
      }).catch(() => "");
    }
    if (!html) return [];
    const $ = load(html);
    const items: SearchResult[] = [];
    const nodes = $(".hl-list-item").length
      ? $(".hl-list-item")
      : $(".hl-vod-list .hl-item");
    const limit = Math.max(
      1,
      Math.min(Number((ext as any)?.__detail_limit) || 8, 20)
    );
    const tasks: Array<Promise<void>> = [];
    nodes.each((_, el) => {
      if (tasks.length >= limit) return false as any;
      const s = $(el);
      const a = s.find("a").first();
      const titleEl = s.find(".hl-item-title a").first();
      const title = (titleEl.text() || a.attr("title") || "").trim();
      let href = a.attr("href") || titleEl.attr("href") || "";
      if (!href) return;
      if (href.startsWith("/")) href = BASE + href;
      tasks.push(
        (async () => {
          const detailLinks = await fetchDetailLinks(href, timeout);
          if (detailLinks.length) {
            items.push({
              message_id: "",
              unique_id: `fox4k-${href}`,
              channel: "",
              datetime: new Date().toISOString(),
              title,
              content: "",
              links: detailLinks,
            });
          }
        })()
      );
    });
    await Promise.allSettled(tasks);
    return items;
  }
}

