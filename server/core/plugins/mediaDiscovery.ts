import pLimit from "p-limit";
import { load } from "cheerio";
import { BaseAsyncPlugin } from "./manager";
import type { Link, SearchResult, TorrentMetadata } from "../types/models";
import {
  classifyShareUrl,
  extractSharePassword,
  isStrictTitleMatch,
} from "../../../utils/sourceContent";
import {
  enrichTorrentMetadata,
  formatTorrentSize,
  magnetInfoHash,
  magnetTrackerCount,
} from "../../../utils/torrentMetadata";

const BASE_URL = "https://www.6vdy.org";
const SEARCH_URL = `${BASE_URL}/e/search/11index.php`;
const EZTV_API_URL = "https://eztvx.to/api/get-torrents";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const MAX_DETAIL_PAGES = 3;
const MAX_DETAIL_MAGNETS = 24;
const MAX_EZTV_IMDB_IDS = 2;
const MAX_EZTV_MAGNETS = 30;

export interface MediaSearchCandidate {
  id: string;
  title: string;
  detailUrl: string;
  datetime: string;
}

export interface ParsedMediaMagnet {
  title: string;
  url: string;
  source: string;
  datetime?: string;
  metadata?: TorrentMetadata;
}

export interface ParsedMediaDetail {
  title: string;
  imdbId?: string;
  cloudLinks: Link[];
  magnets: ParsedMediaMagnet[];
}

function cleanText(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function absolute6vUrl(value: string, base = BASE_URL): string {
  try {
    const url = new URL(value, base);
    return url.hostname === "6vdy.org" || url.hostname.endsWith(".6vdy.org")
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function numberValue(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function magnetTitle(url: string, fallback = "磁力资源"): string {
  try {
    return cleanText(new URL(url).searchParams.get("dn") || fallback);
  } catch {
    return cleanText(fallback) || "磁力资源";
  }
}

function magnetSource(url: string): string {
  const decoded = (() => {
    try {
      return decodeURIComponent(url);
    } catch {
      return url;
    }
  })();
  return /dygang\.me|电影港/i.test(decoded) ? "电影港" : "6v电影";
}

function relevantTitle(parentTitle: string, itemTitle: string, keyword: string): string {
  const child = cleanText(itemTitle);
  if (!child || child === parentTitle) return parentTitle;
  return isStrictTitleMatch(child, keyword)
    ? child
    : `${parentTitle} · ${child}`;
}

export function parseMediaSearchCandidates(
  html: string,
  keyword: string
): MediaSearchCandidate[] {
  const $ = load(html);
  const candidates: MediaSearchCandidate[] = [];
  const seen = new Set<string>();

  $("#post_container .post").each((_, element) => {
    if (candidates.length >= MAX_DETAIL_PAGES) return;
    const node = $(element);
    const titleLink = node.find(".article h2 a, h2 a").first();
    const title = cleanText(titleLink.text() || titleLink.attr("title") || "");
    const detailUrl = absolute6vUrl(titleLink.attr("href") || "");
    if (!title || !detailUrl || seen.has(detailUrl)) return;
    if (!isStrictTitleMatch(title, keyword)) return;
    seen.add(detailUrl);
    candidates.push({
      id: detailUrl.match(/\/(\d+)\.html(?:$|[?#])/)?.[1] || title,
      title,
      detailUrl,
      datetime: cleanText(node.find(".info_date").first().text()),
    });
  });
  return candidates;
}

export function parseMediaDetailPage(html: string): ParsedMediaDetail {
  const $ = load(html);
  const scope = $("#post_content").first();
  const title = cleanText(
    $(".article_container > h1").first().text() ||
      $("article h1").first().text() ||
      $("h1").first().text()
  );
  const contentHtml = String(scope.length ? scope.html() || "" : $.html()).replace(
    /&amp;/gi,
    "&"
  );
  const contentText = scope.length ? scope.text() : $.root().text();
  const cloudLinks: Link[] = [];
  const magnets: ParsedMediaMagnet[] = [];
  const seenCloud = new Set<string>();
  const seenMagnets = new Set<string>();

  const addCloudLink = (rawUrl: string, context = "") => {
    const url = String(rawUrl || "").trim().replace(/[),，。；;]+$/g, "");
    const type = classifyShareUrl(url);
    if (!type || type === "magnet" || seenCloud.has(url)) return;
    seenCloud.add(url);
    cloudLinks.push({
      type,
      url,
      password: extractSharePassword(url, context),
    });
  };

  const addMagnet = (rawUrl: string, label = "") => {
    if (magnets.length >= MAX_DETAIL_MAGNETS) return;
    const url = String(rawUrl || "").trim().replace(/&amp;/gi, "&");
    const hash = magnetInfoHash(url);
    if (!hash || seenMagnets.has(hash)) return;
    seenMagnets.add(hash);
    const source = magnetSource(url);
    const displayTitle = cleanText(label) || magnetTitle(url);
    magnets.push({
      title: /^(?:磁力|下载|磁力下载|点击下载)$/i.test(displayTitle)
        ? magnetTitle(url)
        : displayTitle,
      url,
      source,
      metadata: enrichTorrentMetadata(displayTitle, "", {
        infoHash: hash,
        category: "影视",
        sources: [source],
        originSource: source,
        trackerCount: magnetTrackerCount(url),
      }),
    });
  };

  const anchors = scope.length ? scope.find("a[href]") : $("a[href]");
  anchors.each((_, element) => {
    const node = $(element);
    const url = node.attr("href") || "";
    const type = classifyShareUrl(url);
    if (type === "magnet") addMagnet(url, node.text());
    else if (type) addCloudLink(url, node.parent().text());
  });

  for (const match of contentHtml.match(/https?:\/\/[^\s"'<>（）【】]+/gi) || []) {
    const index = contentHtml.indexOf(match);
    addCloudLink(match, contentHtml.slice(Math.max(0, index - 80), index + match.length + 80));
  }
  for (const match of contentHtml.match(/magnet:\?xt=urn:btih:[a-z0-9]{32,40}[^\s"'<>]*/gi) || []) {
    addMagnet(match);
  }

  return {
    title,
    imdbId: `${contentText} ${contentHtml}`.match(/\btt\d{7,10}\b/i)?.[0].toLowerCase(),
    cloudLinks,
    magnets,
  };
}

export function parseEztvResponse(payload: unknown): ParsedMediaMagnet[] {
  const rows = Array.isArray((payload as any)?.torrents)
    ? (payload as any).torrents
    : [];
  const results: ParsedMediaMagnet[] = [];
  const seen = new Set<string>();
  const checkedAt = new Date().toISOString();

  for (const row of rows) {
    if (results.length >= MAX_EZTV_MAGNETS) break;
    const hash = String(row?.hash || "").trim().toLowerCase();
    const rawMagnet = String(row?.magnet_url || "").replace(/&amp;/gi, "&");
    const name = cleanText(row?.title || row?.filename || "EZTV 影视资源");
    const url = magnetInfoHash(rawMagnet)
      ? rawMagnet
      : /^[a-f0-9]{40}$/i.test(hash)
        ? `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}`
        : "";
    const infoHash = magnetInfoHash(url);
    if (!url || !infoHash || seen.has(infoHash)) continue;
    seen.add(infoHash);

    const sizeBytes = numberValue(row?.size_bytes);
    const releasedUnix = numberValue(row?.date_released_unix);
    const datetime = releasedUnix && releasedUnix > 0
      ? new Date(releasedUnix * 1_000).toISOString()
      : undefined;
    results.push({
      title: name,
      url,
      source: "EZTV",
      datetime,
      metadata: enrichTorrentMetadata(name, "", {
        infoHash,
        sizeBytes,
        size: formatTorrentSize(sizeBytes),
        seeders: numberValue(row?.seeds),
        leechers: numberValue(row?.peers),
        category: "影视",
        sources: ["EZTV"],
        originSource: "EZTV",
        trackerCount: magnetTrackerCount(url),
        lastSeenAt: datetime || checkedAt,
        metadataCheckedAt: checkedAt,
      }),
    });
  }
  return results;
}

async function fetchSearchPage(keyword: string, signal?: AbortSignal): Promise<string> {
  const body = new URLSearchParams({
    show: "title",
    tempid: "1",
    tbname: "article",
    mid: "1",
    dopost: "search",
    keyboard: keyword,
  });
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    redirect: "manual",
    headers: {
      accept: "text/html",
      "content-type": "application/x-www-form-urlencoded",
      origin: BASE_URL,
      referer: `${BASE_URL}/`,
      "user-agent": USER_AGENT,
    },
    body,
    signal,
  }).catch(() => undefined);
  if (!response) return "";
  if (response.ok) return response.text();
  if (response.status < 300 || response.status >= 400) return "";
  const resultUrl = absolute6vUrl(
    response.headers.get("location") || "",
    SEARCH_URL
  );
  if (!resultUrl) return "";
  const resultResponse = await fetch(resultUrl, {
    headers: { accept: "text/html", referer: `${BASE_URL}/`, "user-agent": USER_AGENT },
    signal,
  }).catch(() => undefined);
  return resultResponse?.ok ? resultResponse.text() : "";
}

async function fetchMediaDetail(
  candidate: MediaSearchCandidate,
  signal?: AbortSignal
): Promise<ParsedMediaDetail & { candidate: MediaSearchCandidate }> {
  const response = await fetch(candidate.detailUrl, {
    headers: { accept: "text/html", referer: `${BASE_URL}/`, "user-agent": USER_AGENT },
    signal,
  }).catch(() => undefined);
  const detail = response?.ok
    ? parseMediaDetailPage(await response.text())
    : { title: "", cloudLinks: [], magnets: [] };
  return { ...detail, candidate };
}

async function fetchEztv(imdbId: string, signal?: AbortSignal): Promise<ParsedMediaMagnet[]> {
  const imdbNumber = imdbId.replace(/^tt/i, "");
  const response = await fetch(
    `${EZTV_API_URL}?limit=${MAX_EZTV_MAGNETS}&imdb_id=${encodeURIComponent(imdbNumber)}`,
    {
      headers: { accept: "application/json", "user-agent": USER_AGENT },
      signal,
    }
  ).catch(() => undefined);
  if (!response?.ok) return [];
  return parseEztvResponse(await response.json().catch(() => undefined));
}

export class MediaDiscoveryPlugin extends BaseAsyncPlugin {
  constructor() {
    super("影视直达", 2);
  }

  timeoutMs(): number {
    return 3700;
  }

  useKeywordVariants(): boolean {
    return false;
  }

  override async search(
    keyword: string,
    ext: Record<string, any> = {}
  ): Promise<SearchResult[]> {
    const signal = ext.signal as AbortSignal | undefined;
    const searchHtml = await fetchSearchPage(keyword, signal);
    if (!searchHtml) return [];
    const candidates = parseMediaSearchCandidates(searchHtml, keyword);
    if (!candidates.length) return [];

    const detailLimit = pLimit(2);
    const details = await Promise.all(
      candidates.map((candidate) =>
        detailLimit(() => fetchMediaDetail(candidate, signal))
      )
    );
    const imdbDetails = details
      .filter((detail) => detail.imdbId)
      .filter(
        (detail, index, values) =>
          values.findIndex((candidate) => candidate.imdbId === detail.imdbId) === index
      )
      .slice(0, MAX_EZTV_IMDB_IDS);
    const eztvByImdb = new Map<string, ParsedMediaMagnet[]>();
    await Promise.all(
      imdbDetails.map(async (detail) => {
        const imdbId = detail.imdbId as string;
        eztvByImdb.set(imdbId, await fetchEztv(imdbId, signal));
      })
    );

    const results: SearchResult[] = [];
    for (const detail of details) {
      const parentTitle = detail.title || detail.candidate.title;
      if (detail.cloudLinks.length) {
        results.push({
          message_id: "",
          unique_id: `media-6v-cloud-${detail.candidate.id}`,
          channel: "",
          datetime: detail.candidate.datetime,
          title: parentTitle,
          content: "6v电影公开分享链接",
          source: "6v电影",
          links: detail.cloudLinks,
        });
      }

      const allMagnets = [
        ...detail.magnets,
        ...(detail.imdbId ? eztvByImdb.get(detail.imdbId) || [] : []),
      ];
      for (const magnet of allMagnets) {
        const hash = magnetInfoHash(magnet.url);
        if (!hash) continue;
        results.push({
          message_id: "",
          unique_id: `media-magnet-${hash}`,
          channel: "",
          datetime: magnet.datetime || detail.candidate.datetime,
          title: relevantTitle(parentTitle, magnet.title, keyword),
          content: `磁力来源：${magnet.source}`,
          source: magnet.source,
          links: [{ type: "magnet", url: magnet.url, password: "" }],
          metadata: magnet.metadata,
        });
      }
    }
    return results;
  }
}
