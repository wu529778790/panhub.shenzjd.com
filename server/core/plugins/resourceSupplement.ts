import pLimit from "p-limit";
import { load } from "cheerio";
import { BaseAsyncPlugin } from "./manager";
import type { Link, SearchResult } from "../types/models";
import {
  classifyShareUrl,
  extractSharePassword,
  isStrictTitleMatch,
} from "../../../utils/sourceContent";

const BASE_URL = "https://mizixing.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";

function extractLinks(value: string): Link[] {
  const decoded = String(value || "").replace(/&amp;/g, "&");
  const matches = decoded.match(/https?:\/\/[^\s<>"'）】]+/gi) || [];
  const seen = new Set<string>();
  const links: Link[] = [];
  for (const candidate of matches) {
    const url = candidate.replace(/[),，。；;]+$/g, "");
    const type = classifyShareUrl(url);
    if (!type || seen.has(url)) continue;
    seen.add(url);
    links.push({
      type,
      url,
      password: extractSharePassword(url, decoded),
    });
  }
  return links;
}

async function fetchDetailLinks(url: string, signal?: AbortSignal): Promise<Link[]> {
  const response = await fetch(url, {
    headers: { accept: "text/html", "user-agent": USER_AGENT },
    signal,
  }).catch(() => undefined);
  if (!response?.ok) return [];
  const html = await response.text();
  const $ = load(html);
  const hrefs = $("a[href]")
    .map((_, element) => $(element).attr("href") || "")
    .get()
    .join(" ");
  return extractLinks(`${$("article, .article-content, .content").text()} ${hrefs}`);
}

export class ResourceSupplementPlugin extends BaseAsyncPlugin {
  constructor() {
    super("资源补充", 3);
  }

  timeoutMs(): number {
    return 2800;
  }

  useKeywordVariants(): boolean {
    return false;
  }

  override async search(
    keyword: string,
    ext: Record<string, any> = {}
  ): Promise<SearchResult[]> {
    const signal = ext.signal as AbortSignal | undefined;
    const response = await fetch(`${BASE_URL}/?s=${encodeURIComponent(keyword)}`, {
      headers: { accept: "text/html", "user-agent": USER_AGENT },
      signal,
    }).catch(() => undefined);
    if (!response?.ok) return [];

    const $ = load(await response.text());
    const candidates: Array<{
      id: string;
      title: string;
      detailUrl: string;
      datetime: string;
      links: Link[];
    }> = [];

    $("article.excerpt").each((_, article) => {
      if (candidates.length >= 10) return;
      const node = $(article);
      const titleLink = node.find("h2 a").first();
      const title = titleLink.text().replace(/\s+/g, " ").trim();
      const detailUrl = titleLink.attr("href") || "";
      if (
        !title ||
        !detailUrl ||
        !isStrictTitleMatch(title, keyword)
      ) return;
      const note = node.find("p.note").text();
      const hrefs = node
        .find("a[href]")
        .map((__, link) => $(link).attr("href") || "")
        .get()
        .join(" ");
      candidates.push({
        id: detailUrl.replace(/\/$/, "").split("/").pop() || title,
        title,
        detailUrl,
        datetime: node.find("time").attr("datetime") || "",
        links: extractLinks(`${note} ${hrefs}`),
      });
    });

    const detailLimit = pLimit(2);
    await Promise.all(
      candidates
        .filter((candidate) => candidate.links.length === 0)
        .slice(0, 3)
        .map((candidate) =>
          detailLimit(async () => {
            candidate.links = await fetchDetailLinks(candidate.detailUrl, signal);
          })
        )
    );

    return candidates
      .filter((candidate) => candidate.links.length > 0)
      .map((candidate) => ({
        message_id: "",
        unique_id: `supplement-${candidate.id}`,
        channel: "",
        datetime: candidate.datetime,
        title: candidate.title,
        content: "",
        source: "资源补充",
        links: candidate.links,
      }));
  }
}

export { extractLinks as extractSupplementLinks };
