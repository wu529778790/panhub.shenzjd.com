import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";

const BASE = "https://nyaa.si";
const SEARCH = (kw: string) =>
  `${BASE}/?f=0&c=0_0&q=${encodeURIComponent(kw)}&s=seeders&o=desc`;

async function fetchDetailMagnet(url: string): Promise<string> {
  try {
    const html = await ofetch<string>(url, {
      headers: { "user-agent": "Mozilla/5.0", referer: BASE + "/" },
      timeout: 10000,
    });
    const $ = load(html);
    return $("a[href^='magnet:']").attr("href") || "";
  } catch {
    return "";
  }
}

export class NyaaPlugin extends BaseAsyncPlugin {
  constructor() {
    super("nyaa", 4);
  }

  override async search(keyword: string): Promise<SearchResult[]> {
    const html = await ofetch<string>(SEARCH(keyword), {
      headers: {
        "user-agent": "Mozilla/5.0",
        referer: BASE + "/",
      },
      timeout: 10000,
    }).catch(() => "");
    if (!html) return [];
    const $ = load(html);
    const out: SearchResult[] = [];
    const tasks: Promise<void>[] = [];

    $("table tbody tr").each((_, tr) => {
      const row = $(tr);
      const tds = row.find("td");
      if (!tds.length) return;
      const titleA = tds.eq(1).find("a").last();
      const title = (titleA.text() || "").trim();
      if (!title) return;
      const pageHref = titleA.attr("href") || ""; // /view/xxxxxx
      const detail = pageHref.startsWith("/") ? `${BASE}${pageHref}` : pageHref;
      const unique = detail
        ? `nyaa-${detail.split("/").pop()}`
        : `nyaa-${title}`;
      let magnet = row.find("a[href^='magnet:']").attr("href") || "";
      if (!magnet && detail) {
        tasks.push(
          (async () => {
            const mg = await fetchDetailMagnet(detail);
            if (!mg) return;
            out.push({
              message_id: "",
              unique_id: unique,
              channel: "",
              datetime: new Date().toISOString(),
              title,
              content: "",
              links: [{ type: "magnet", url: mg, password: "" }],
            });
          })()
        );
        return;
      }
      if (!magnet) return;
      const size = row.find("td").eq(3).text().trim();
      const seeders = row.find("td").eq(5).text().trim();
      const leechers = row.find("td").eq(6).text().trim();
      const contentParts: string[] = [];
      if (size) contentParts.push(`Size: ${size}`);
      if (seeders) contentParts.push(`Seeders: ${seeders}`);
      if (leechers) contentParts.push(`Leechers: ${leechers}`);

      out.push({
        message_id: "",
        unique_id: unique,
        channel: "",
        datetime: new Date().toISOString(),
        title,
        content: contentParts.join(" | "),
        links: [{ type: "magnet", url: magnet, password: "" }],
      });
    });

    if (tasks.length) await Promise.allSettled(tasks);
    return out;
  }
}

