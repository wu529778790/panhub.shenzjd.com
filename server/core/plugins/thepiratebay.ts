import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";

const BASE = "https://tpirbay.xyz";
const SEARCH = (kw: string, page = 1) =>
  page === 1
    ? `${BASE}/search/${encodeURIComponent(kw)}/1/99/0`
    : `${BASE}/search/${encodeURIComponent(kw)}/${page}/99/0`;

const reMagnet = /magnet:\?xt=urn:btih:[0-9a-fA-F]{40}[^"'\s]*/;

export class ThePirateBayPlugin extends BaseAsyncPlugin {
  constructor() {
    super("thepiratebay", 4);
  }
  override async search(
    keyword: string,
    ext?: Record<string, any>
  ): Promise<SearchResult[]> {
    const timeout = Math.max(
      3000,
      Number((ext as any)?.__plugin_timeout_ms) || 10000
    );
    const html = await ofetch<string>(SEARCH(keyword, 1), {
      headers: { "user-agent": "Mozilla/5.0", referer: BASE + "/" },
      timeout,
    }).catch(() => "");
    if (!html) return [];
    const $ = load(html);
    const out: SearchResult[] = [];
    $("table#searchResult tr").each((_, tr) => {
      const row = $(tr);
      if (row.hasClass("header")) return;
      const titleA = row.find(".detName a.detLink").first();
      const title = titleA.text().trim();
      if (!title) return;
      const magnet = row.find("a[href^='magnet:']").attr("href") || "";
      if (!magnet || !reMagnet.test(magnet)) return;
      const det = row.find(".detDesc").text().trim();
      const seeders = row.find("td").eq(2).text().trim();
      const leechers = row.find("td").eq(3).text().trim();
      let content = det;
      if (seeders && leechers)
        content += `, Seeders: ${seeders}, Leechers: ${leechers}`;
      out.push({
        message_id: "",
        unique_id: `thepiratebay-${title}`,
        channel: "",
        datetime: "",
        title: title.replaceAll(".", " "),
        content,
        links: [{ type: "magnet", url: magnet, password: "" }],
      });
    });
    return out;
  }
}

