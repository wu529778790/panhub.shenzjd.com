import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import { load } from "cheerio";
import {
  enrichTorrentMetadata,
  formatTorrentSize,
  magnetInfoHash,
  magnetTrackerCount,
} from "../../../utils/torrentMetadata";
import { isStrictTitleMatch } from "../../../utils/sourceContent";
import {
  markSourceCache,
  readMagnetSearchCache,
  writeMagnetSearchCache,
} from "../services/magnetSearchCache";

type SolidItem = {
  title: string;
  magnet?: string;
  infohash?: string;
  size?: number;
  seeders?: number;
  leechers?: number;
  downloads?: number;
  verified?: boolean;
  updatedAt?: string;
  category?: string | number;
  files?: number | unknown[];
  uploaded?: string;
  id?: string;
};

type SolidResp = {
  results: SolidItem[];
};

const API_PRIMARY = (kw: string) =>
  `https://bitsearch.eu/api/v1/search?q=${encodeURIComponent(
    kw
  )}&category=all&sort=seeders&limit=50`; // public JSON
const API_FALLBACK = (kw: string) =>
  `https://bitsearch.to/api/v1/search?q=${encodeURIComponent(
    kw
  )}&category=all&sort=seeders&limit=50`;
const SEARCH_HTML = (kw: string) =>
  `https://solidtorrents.to/search?q=${encodeURIComponent(kw)}&sort=seeders`;

function catalogQueryVariant(keyword: string): string | undefined {
  const value = String(keyword || "").trim();
  const catalog = value.match(/^([a-z]{2,12})[-_\s]+(\d{2,6})$/i);
  if (!catalog) return undefined;
  const compact = `${catalog[1]}${catalog[2]}`;
  return compact.toLowerCase() === value.toLowerCase() ? undefined : compact;
}

function combinedSignal(
  signal: AbortSignal | undefined,
  controller: AbortController
): AbortSignal {
  return signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
}

function isUsableHtml(value: string): boolean {
  return Boolean(
    value &&
    !/Just a moment|cf-browser-verification/i.test(value)
  );
}

async function fetchHtmlWithFallback(
  url: string,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<string> {
  const controller = new AbortController();
  const requestSignal = combinedSignal(signal, controller);
  const proxyUrl = `https://r.jina.ai/http://solidtorrents.to${url.replace(
    /^https?:\/\/solidtorrents\.to/,
    ""
  )}`;
  const options = {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      referer: "https://solidtorrents.to/",
    },
    timeout: timeoutMs,
    signal: requestSignal,
  };
  const candidates = [
    ofetch<string>(url, options),
    ofetch<string>(proxyUrl, {
      headers: { "user-agent": "Mozilla/5.0" },
      timeout: timeoutMs,
      signal: requestSignal,
    }),
  ].map((promise) =>
    promise.then((html) => {
      if (!isUsableHtml(html)) throw new Error("unusable html");
      return html;
    })
  );
  try {
    return await Promise.any(candidates);
  } catch {
    return "";
  } finally {
    controller.abort();
  }
}

async function fetchDetailMagnet(
  detailUrl: string,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<string> {
  const html = await fetchHtmlWithFallback(detailUrl, timeoutMs, signal);
  if (!html) return "";
  const $ = load(html);
  let magnet = $("a[href^='magnet:']").attr("href") || "";
  if (!magnet)
    magnet =
      $("[data-clipboard-text^='magnet:']").attr("data-clipboard-text") || "";
  return magnet || "";
}

function parseJinaJson(text: string): SolidResp | undefined {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1)) as SolidResp;
  } catch {
    return undefined;
  }
}

async function fetchApi(
  keyword: string,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<SolidResp | undefined> {
  const headers = {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    accept: "application/json",
    referer: "https://bitsearch.eu/",
  };
  const deadline = Date.now() + timeoutMs;
  const directTimeout = Math.min(
    2200,
    Math.max(1200, Math.floor(timeoutMs * 0.45))
  );
  const controller = new AbortController();
  const requestSignal = combinedSignal(signal, controller);
  const fetchCandidate = (url: string) =>
    Promise.resolve(
      ofetch<SolidResp>(url, {
        headers,
        timeout: directTimeout,
        signal: requestSignal,
      })
    ).then((response) => {
      if (!Array.isArray(response?.results) || !response.results.length) {
        throw new Error("empty response");
      }
      return response;
    });
  try {
    return await Promise.any([
      fetchCandidate(API_PRIMARY(keyword)),
      fetchCandidate(API_FALLBACK(keyword)),
    ]);
  } catch {
    // Continue with the read-only proxy inside the same total budget.
  } finally {
    controller.abort();
  }

  const remainingMs = Math.max(500, deadline - Date.now() - 100);
  const proxyUrl = `https://r.jina.ai/http://bitsearch.eu/api/v1/search?q=${encodeURIComponent(
    keyword
  )}&category=all&sort=seeders&limit=50`;
  const proxyText = await Promise.resolve(
    ofetch<string>(proxyUrl, {
      headers: { "user-agent": "Mozilla/5.0", accept: "text/plain" },
      timeout: remainingMs,
      signal,
    })
  ).catch(() => "");
  return proxyText ? parseJinaJson(proxyText) : undefined;
}

async function fetchCatalogVariant(
  keyword: string,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<SolidResp | undefined> {
  return ofetch<SolidResp>(API_PRIMARY(keyword), {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      accept: "application/json",
      referer: "https://bitsearch.eu/",
    },
    timeout: Math.min(2200, Math.max(1200, Math.floor(timeoutMs * 0.25))),
    signal,
  }).catch(() => undefined);
}

export class SolidTorrentsPlugin extends BaseAsyncPlugin {
  constructor() {
    super("solidtorrents", 4);
  }

  timeoutMs(): number {
    return 10000;
  }

  useKeywordVariants(): boolean {
    return false;
  }

  override async search(
    keyword: string,
    ext: Record<string, any> = {}
  ): Promise<SearchResult[]> {
    const timeoutMs = Math.max(
      3000,
      Number((ext as any)?.__plugin_timeout_ms) || 10000
    );
    const signal = ext.signal as AbortSignal | undefined;
    const database = ext.__resource_database;
    const cached = await readMagnetSearchCache(
      database,
      this.name(),
      keyword
    );
    if (cached?.fresh && !ext.__force_magnet_refresh) {
      markSourceCache(ext, "hit");
      return cached.results;
    }
    markSourceCache(ext, "miss");
    const upstreamStartedAt = Date.now();
    const variant = catalogQueryVariant(keyword);
    const [response, variantResponse] = await Promise.all([
      fetchApi(keyword, timeoutMs, signal),
      variant
        ? fetchCatalogVariant(variant, timeoutMs, signal)
        : Promise.resolve(undefined),
    ]);
    let items: SolidItem[] = [
      ...(Array.isArray(response?.results) ? response.results : []),
      ...(Array.isArray(variantResponse?.results) ? variantResponse.results : []),
    ];
    // HTML 兜底：API 无结果或被屏蔽时，直接解析搜索页
    if (!items.length) {
      const remainingMs = Math.max(
        600,
        timeoutMs - (Date.now() - upstreamStartedAt) - 250
      );
      const html = remainingMs >= 800
        ? await fetchHtmlWithFallback(
            SEARCH_HTML(keyword),
            Math.min(1800, remainingMs),
            signal
          )
        : "";
      if (html) {
        const $ = load(html);
        const htmlItems: SolidItem[] = [];
        const tasks: Promise<void>[] = [];
        let detailFetches = 0;
        $("a[href^='/view/']").each((_, a) => {
          const titleA = $(a);
          const title = (titleA.text() || "").trim();
          const href = String(titleA.attr("href") || "");
          const detail = href.startsWith("/")
            ? `https://solidtorrents.to${href}`
            : href;
          const container = titleA.closest("li, article, div");
          let magnet =
            container.find("a[href^='magnet:']").attr("href") || "";
          if (!magnet)
            magnet =
              container
                .find("[data-clipboard-text^='magnet:']")
                .attr("data-clipboard-text") || "";
          if (title && magnet) {
            htmlItems.push({ title, magnet, id: detail.split("/").pop() });
          } else if (title && detail && detailFetches < 4) {
            detailFetches += 1;
            tasks.push(
              (async () => {
                const mg = await fetchDetailMagnet(
                  detail,
                  Math.min(1000, Math.max(600, remainingMs)),
                  signal
                );
                if (mg)
                  htmlItems.push({
                    title,
                    magnet: mg,
                    id: detail.split("/").pop(),
                  });
              })()
            );
          }
        });
        if (tasks.length) await Promise.allSettled(tasks);
        items = htmlItems;
      }
    }
    const out: SearchResult[] = [];
    const seen = new Set<string>();
    const metadataCheckedAt = new Date().toISOString();
    for (const it of items) {
      const hash = String(it.infohash || "").trim();
      const magnet = it.magnet || (hash
        ? `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(it.title || "")}`
        : "");
      if (!magnet) continue;
      const title = (it.title || "").trim();
      if (!title || !isStrictTitleMatch(title, keyword)) continue;
      const infoHash = magnetInfoHash(magnet);
      const dedupeKey = infoHash || String(it.id || title).toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const unique = `solid-${it.id || infoHash || title}`;
      const datetime = it.uploaded || "";
      const fileCount = Array.isArray(it.files)
        ? it.files.length
        : typeof it.files === "number"
          ? it.files
          : undefined;
      const metadata = enrichTorrentMetadata(title, "", {
        infoHash,
        size: typeof it.size === "number" && it.size > 0
          ? formatTorrentSize(it.size)
          : undefined,
        sizeBytes: typeof it.size === "number" && it.size > 0 ? it.size : undefined,
        seeders: typeof it.seeders === "number" ? it.seeders : undefined,
        leechers: typeof it.leechers === "number" ? it.leechers : undefined,
        completed: typeof it.downloads === "number" ? it.downloads : undefined,
        fileCount,
        category: typeof it.category === "string" ? it.category : undefined,
        verified: it.verified === true || undefined,
        trackerCount: magnetTrackerCount(magnet),
        lastSeenAt: it.updatedAt || undefined,
        metadataCheckedAt,
        sources: ["BitSearch"],
      });
      out.push({
        message_id: "",
        unique_id: unique,
        channel: "BitSearch",
        datetime,
        title,
        content: "",
        source: "BitSearch",
        metadata,
        links: [{ type: "magnet", url: magnet, password: "" }],
      });
    }
    if (out.length) {
      await writeMagnetSearchCache(database, this.name(), keyword, out);
      return out;
    }
    return cached?.results || [];
  }
}
