import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";

const SEARCH = (kw: string) =>
  `https://xuexizhinan.com/?post_type=book&s=${encodeURIComponent(kw)}`;

const re = {
  magnet: /magnet:\?xt=urn:btih:[0-9a-fA-F]{40}[^"'\s]*/g,
  quark: /https?:\/\/pan\.quark\.cn\/s\/[0-9a-zA-Z]+/g,
};

function collectLinks(html: string): SearchResult["links"] {
  const links: SearchResult["links"] = [];
  const add = (u: string, type: string) => {
    if (!u) return;
    if (links.some((l) => l.url === u)) return;
    links.push({ type, url: u, password: "" });
  };
  for (const m of html.match(re.magnet) || []) add(m, "magnet");
  for (const m of html.match(re.quark) || []) add(m, "quark");
  return links;
}

async function fetchDetail(url: string) {
  try {
    const html = await ofetch<string>(url, {
      headers: { "user-agent": "Mozilla/5.0" },
      timeout: 10000,
    });
    const $ = load(html);
    const title =
      $(".book-header h1").text().trim() ||
      $("title")
        .text()
        .replace(/\|\s*4K指南.*/i, "")
        .trim();
    const content = $(".panel-body.single").text().trim();
    const body = $("body").html() || "";
    const links = collectLinks(body);
    return { title, content, links };
  } catch {
    return { title: "", content: "", links: [] as SearchResult["links"] };
  }
}

export class XuexizhinanPlugin extends BaseAsyncPlugin {
  constructor() {
    super("xuexizhinan", 1);
  }
  override async search(keyword: string): Promise<SearchResult[]> {
    const html = await ofetch<string>(SEARCH(keyword), {
      headers: { "user-agent": "Mozilla/5.0" },
      timeout: 10000,
    }).catch(() => "");
    if (!html) return [];
    const $ = load(html);
    const out: SearchResult[] = [];
    const tasks: Promise<any>[] = [];
    $(".url-card").each((_, el) => {
      const s = $(el);
      const t = s.find(".list-title");
      const href = t.attr("href") || "";
      const title = t.text().trim();
      if (!href || !title) return;
      tasks.push(
        (async () => {
          const detail = await fetchDetail(href);
          if (detail.links.length) {
            out.push({
              message_id: "",
              unique_id: `xuexizhinan-${href}`,
              channel: "",
              datetime: "",
              title: detail.title || title,
              content: detail.content,
              links: detail.links,
            });
          }
        })()
      );
    });
    await Promise.allSettled(tasks);
    return out;
  }
}

