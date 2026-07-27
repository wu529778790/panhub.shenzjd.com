import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { ofetch } from "ofetch";
import {
  enrichTorrentMetadata,
  magnetInfoHash,
  magnetTrackerCount,
  mergeTorrentMetadata,
  parseTorrentSize,
  scoreTorrentResult,
} from "../../../utils/torrentMetadata";
import { isStrictTitleMatch } from "../../../utils/sourceContent";
import {
  markSourceCache,
  readMagnetSearchCache,
  writeMagnetSearchCache,
} from "../services/magnetSearchCache";

interface RssSource {
  name: string;
  url: (keyword: string) => string;
  format: "nyaa" | "animetosho";
}

const TRACKERS = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.torrent.eu.org:451/announce",
];

const SOURCES: RssSource[] = [
  {
    name: "Nyaa",
    url: (keyword) =>
      `https://nyaa.si/?page=rss&f=0&c=0_0&q=${encodeURIComponent(keyword)}`,
    format: "nyaa",
  },
  {
    name: "Sukebei",
    url: (keyword) =>
      `https://sukebei.nyaa.si/?page=rss&f=0&c=0_0&q=${encodeURIComponent(keyword)}`,
    format: "nyaa",
  },
  {
    name: "AnimeTosho",
    url: (keyword) =>
      `https://feed.animetosho.org/rss2?q=${encodeURIComponent(keyword)}`,
    format: "animetosho",
  },
];

function decodeXml(value: string): string {
  return String(value || "")
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readTag(block: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(
    new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i")
  );
  return decodeXml(match?.[1]?.trim() || "");
}

function buildMagnet(hash: string, title: string): string {
  const base = `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title)}`;
  return `${base}${TRACKERS.map((tracker) => `&tr=${encodeURIComponent(tracker)}`).join("")}`;
}

function parseRss(
  xml: string,
  source: RssSource,
  keyword: string,
  metadataCheckedAt: string
): SearchResult[] {
  const results: SearchResult[] = [];
  for (const match of String(xml || "").matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = match[1] || "";
    const title = readTag(item, "title").replace(/<[^>]+>/g, "").trim();
    if (!title || !isStrictTitleMatch(title, keyword)) continue;

    const description = readTag(item, "description");
    const suppliedMagnet = decodeXml(
      description.match(/href=["'](magnet:\?[^"']+)/i)?.[1] || ""
    );
    const rawHash =
      readTag(item, "nyaa:infoHash") || magnetInfoHash(suppliedMagnet) || "";
    const normalizedHash = magnetInfoHash(
      suppliedMagnet || `magnet:?xt=urn:btih:${rawHash}`
    );
    if (!normalizedHash) continue;

    const magnet = suppliedMagnet || buildMagnet(normalizedHash, title);
    const size =
      readTag(item, "nyaa:size") ||
      description.match(/Total Size<\/strong>:\s*([^<]+)/i)?.[1]?.trim() ||
      "";
    const seeders = Number(readTag(item, "nyaa:seeders"));
    const leechers = Number(readTag(item, "nyaa:leechers"));
    const completed = Number(readTag(item, "nyaa:downloads"));
    const fileCount = Number(
      description.match(/>(\d+)\s+file\(s\)<\/a>/i)?.[1] || ""
    );
    const category = readTag(item, "nyaa:category");
    const trusted = readTag(item, "nyaa:trusted");
    const origin = source.format === "animetosho" ? readTag(item, "source") : "";

    results.push({
      message_id: "",
      unique_id: `magnet-${normalizedHash}`,
      channel: source.name,
      datetime: readTag(item, "pubDate"),
      title,
      content: "",
      source: source.name,
      metadata: enrichTorrentMetadata(title, "", {
        adult: source.name === "Sukebei" || undefined,
        infoHash: normalizedHash,
        size: size || undefined,
        sizeBytes: parseTorrentSize(size),
        seeders: Number.isFinite(seeders) && readTag(item, "nyaa:seeders")
          ? seeders
          : undefined,
        leechers: Number.isFinite(leechers) && readTag(item, "nyaa:leechers")
          ? leechers
          : undefined,
        completed:
          Number.isFinite(completed) && readTag(item, "nyaa:downloads")
            ? completed
            : undefined,
        fileCount: Number.isFinite(fileCount) && fileCount > 0
          ? fileCount
          : undefined,
        category: category || undefined,
        verified: /^yes$/i.test(trusted) || undefined,
        trackerCount: magnetTrackerCount(magnet),
        lastSeenAt: metadataCheckedAt,
        metadataCheckedAt,
        originSource: origin || undefined,
        sources: [...new Set([source.name, origin].filter(Boolean))],
      }),
      links: [{ type: "magnet", url: magnet, password: "" }],
    });
  }
  return results;
}

export class NyaaPlugin extends BaseAsyncPlugin {
  constructor() {
    super("nyaa", 4);
  }

  timeoutMs(): number {
    return 3200;
  }

  useKeywordVariants(): boolean {
    return false;
  }

  override async search(
    keyword: string,
    ext: Record<string, any> = {}
  ): Promise<SearchResult[]> {
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
    const metadataCheckedAt = new Date().toISOString();
    const responses = await Promise.all(
      SOURCES.map(async (source) => ({
        source,
        xml: await ofetch<string>(source.url(keyword), {
          headers: {
            accept: "application/rss+xml, application/xml, text/xml",
            "user-agent": "Mozilla/5.0",
          },
          timeout: 3000,
          signal,
        }).catch(() => ""),
      }))
    );

    const byHash = new Map<string, SearchResult>();
    for (const response of responses) {
      for (const incoming of parseRss(
        response.xml,
        response.source,
        keyword,
        metadataCheckedAt
      )) {
        const hash = incoming.metadata?.infoHash;
        if (!hash) continue;
        const existing = byHash.get(hash);
        if (!existing) {
          byHash.set(hash, incoming);
          continue;
        }
        const preferIncoming =
          scoreTorrentResult(incoming, keyword) >
          scoreTorrentResult(existing, keyword);
        const existingTime = Date.parse(existing.datetime || "");
        const incomingTime = Date.parse(incoming.datetime || "");
        byHash.set(hash, {
          ...existing,
          title: preferIncoming ? incoming.title : existing.title,
          datetime:
            Number.isFinite(incomingTime) &&
            (!Number.isFinite(existingTime) || incomingTime > existingTime)
              ? incoming.datetime
              : existing.datetime,
          links: [
            incoming.links[0]!.url.length > existing.links[0]!.url.length
              ? incoming.links[0]!
              : existing.links[0]!,
          ],
          metadata: mergeTorrentMetadata(existing.metadata, incoming.metadata),
        });
      }
    }

    const results = [...byHash.values()]
      .sort(
        (left, right) =>
          scoreTorrentResult(right, keyword) -
          scoreTorrentResult(left, keyword)
      )
      .slice(0, 100);
    if (results.length) {
      await writeMagnetSearchCache(database, this.name(), keyword, results);
      return results;
    }
    return cached?.results || [];
  }
}
