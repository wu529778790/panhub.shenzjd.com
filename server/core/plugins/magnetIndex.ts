import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import { load } from "cheerio";
import {
  enrichTorrentMetadata,
  formatTorrentSize,
  magnetInfoHash,
  magnetTrackerCount,
  mergeTorrentMetadata,
  scoreTorrentResult,
} from "../../../utils/torrentMetadata";
import { isStrictTitleMatch } from "../../../utils/sourceContent";
import {
  markSourceCache,
  readMagnetSearchCache,
  writeMagnetSearchCache,
} from "../services/magnetSearchCache";

interface KnabenHit {
  hash?: string | null;
  magnetUrl?: string | null;
  title?: string;
  category?: string;
  date?: string;
  bytes?: number;
  seeders?: number;
  peers?: number;
  grabs?: number;
  lastSeen?: string;
  cachedOrigin?: string;
  tracker?: string;
  virusDetection?: number;
}

interface KnabenResponse {
  hits?: KnabenHit[];
}

interface ApiBayItem {
  id?: string;
  name?: string;
  info_hash?: string;
  leechers?: string | number;
  seeders?: string | number;
  size?: string | number;
  num_files?: string | number;
  added?: string | number;
  status?: string;
  category?: string;
}

interface TorrentsCsvItem {
  id?: number;
  infohash?: string;
  name?: string;
  size_bytes?: number;
  created_unix?: number;
  seeders?: number;
  leechers?: number;
  completed?: number;
  scraped_date?: number;
}

interface TorrentsCsvResponse {
  torrents?: TorrentsCsvItem[];
}

interface TorrentDownloadsItem {
  title: string;
  infoHash: string;
  size?: number;
  seeders?: number;
  leechers?: number;
  publishedAt?: string;
  category?: string;
}

const KNABEN_API = "https://api.knaben.org/v1";
const APIBAY_API = "https://apibay.org/q.php";
const TORRENTS_CSV_API = "https://torrents-csv.com/service/search";
const TORRENT_DOWNLOADS_RSS = "https://torrentdownloads.pro/rss.xml";
const TRACKERS = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.torrent.eu.org:451/announce",
];

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;
  try {
    return await fetch(input, { ...init, signal });
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function finiteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function unixDate(value: unknown): string {
  const seconds = finiteNumber(value);
  if (!seconds) return "";
  const timestamp = seconds > 10_000_000_000 ? seconds : seconds * 1000;
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function isoDate(value: unknown): string {
  const timestamp = Date.parse(String(value || "").trim());
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function torrentDownloadsKeyword(keyword: string): string {
  const value = String(keyword || "").trim();
  const catalog = value.match(/^([a-z]{2,12})[-_\s]*(\d{2,6})$/i);
  return catalog ? `${catalog[1]} ${catalog[2]}` : value;
}

function buildMagnet(hash: string, title: string): string {
  const base = `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title)}`;
  return `${base}${TRACKERS.map((tracker) => `&tr=${encodeURIComponent(tracker)}`).join("")}`;
}

function sourceNames(...values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

async function fetchKnaben(
  keyword: string,
  signal?: AbortSignal
): Promise<KnabenHit[]> {
  const response = await fetchWithTimeout(KNABEN_API, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0",
    },
    body: JSON.stringify({
      search_type: "100%",
      search_field: "title",
      query: keyword,
      order_by: "seeders",
      order_direction: "desc",
      size: 100,
      hide_unsafe: false,
      hide_xxx: false,
    }),
    signal,
  }, 1800);
  if (!response?.ok) return [];
  const payload = (await response.json().catch(() => ({}))) as KnabenResponse;
  return Array.isArray(payload.hits) ? payload.hits : [];
}

async function fetchApiBay(
  keyword: string,
  signal?: AbortSignal
): Promise<ApiBayItem[]> {
  const response = await fetchWithTimeout(
    `${APIBAY_API}?q=${encodeURIComponent(keyword)}&cat=0`,
    {
      headers: { accept: "application/json", "user-agent": "Mozilla/5.0" },
      signal,
    },
    1600
  );
  if (!response?.ok) return [];
  const payload = (await response.json().catch(() => [])) as ApiBayItem[];
  return Array.isArray(payload)
    ? payload.filter((item) => item.info_hash && item.name && item.id !== "0")
    : [];
}

async function fetchTorrentsCsv(
  keyword: string,
  signal?: AbortSignal
): Promise<TorrentsCsvItem[]> {
  const response = await fetchWithTimeout(
    `${TORRENTS_CSV_API}?q=${encodeURIComponent(keyword)}&size=100`,
    {
      headers: { accept: "application/json", "user-agent": "Mozilla/5.0" },
      signal,
    },
    1600
  );
  if (!response?.ok) return [];
  const payload = (await response.json().catch(() => ({}))) as TorrentsCsvResponse;
  return Array.isArray(payload.torrents) ? payload.torrents : [];
}

async function fetchTorrentDownloads(
  keyword: string,
  signal?: AbortSignal
): Promise<TorrentDownloadsItem[]> {
  const search = torrentDownloadsKeyword(keyword);
  if (!search) return [];
  const response = await fetchWithTimeout(
    `${TORRENT_DOWNLOADS_RSS}?type=search&search=${encodeURIComponent(search)}`,
    {
      headers: {
        accept: "application/rss+xml, application/xml, text/xml",
        "user-agent": "Mozilla/5.0",
      },
      signal,
    },
    1800
  );
  if (!response?.ok) return [];
  const xml = await response.text().catch(() => "");
  if (!xml) return [];

  const $ = load(xml, { xmlMode: true });
  const items: TorrentDownloadsItem[] = [];
  $("item").each((_, element) => {
    const read = (name: string) =>
      $(element).find(name).first().text().trim();
    const title = read("title");
    const infoHash = read("info_hash");
    if (!title || !infoHash) return;
    items.push({
      title,
      infoHash,
      size: finiteNumber(read("size")),
      seeders: finiteNumber(read("seeders")),
      leechers: finiteNumber(read("leechers")),
      publishedAt: isoDate(read("pubDate")),
      category: read("category") || undefined,
    });
  });
  return items;
}

export class MagnetIndexPlugin extends BaseAsyncPlugin {
  constructor() {
    super("磁力索引", 4);
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
    const [knabenHits, apiBayItems, torrentsCsvItems, torrentDownloadsItems] = await Promise.all([
      fetchKnaben(keyword, signal),
      fetchApiBay(keyword, signal),
      fetchTorrentsCsv(keyword, signal),
      fetchTorrentDownloads(keyword, signal),
    ]);

    const byHash = new Map<string, SearchResult>();
    const add = (incoming: SearchResult) => {
      const magnet = incoming.links[0]?.url || "";
      const hash = magnetInfoHash(magnet);
      if (!hash) return;
      const existing = byHash.get(hash);
      if (!existing) {
        byHash.set(hash, incoming);
        return;
      }

      const preferIncoming =
        scoreTorrentResult(incoming, keyword) >
        scoreTorrentResult(existing, keyword);
      const existingTime = Date.parse(existing.datetime || "");
      const incomingTime = Date.parse(incoming.datetime || "");
      byHash.set(hash, {
        ...existing,
        title: preferIncoming ? incoming.title : existing.title,
        content:
          incoming.content.length > existing.content.length
            ? incoming.content
            : existing.content,
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
    };

    for (const hit of knabenHits) {
      const title = String(hit.title || "").trim();
      const rawHash = String(hit.hash || "").trim();
      const suppliedMagnet = String(hit.magnetUrl || "").trim();
      const normalizedHash = magnetInfoHash(
        suppliedMagnet || `magnet:?xt=urn:btih:${rawHash}`
      );
      if (!title || !normalizedHash || !isStrictTitleMatch(title, keyword)) continue;
      const magnet = suppliedMagnet || buildMagnet(normalizedHash, title);
      const bytes = finiteNumber(hit.bytes);
      const riskScore = finiteNumber(hit.virusDetection);
      const origin = String(hit.cachedOrigin || hit.tracker || "").trim();
      add({
        message_id: "",
        unique_id: `magnet-${normalizedHash}`,
        channel: "Knaben",
        datetime: hit.date || "",
        title,
        content: "",
        source: "Knaben",
        metadata: enrichTorrentMetadata(title, "", {
          size: bytes ? formatTorrentSize(bytes) : undefined,
          sizeBytes: bytes,
          infoHash: normalizedHash,
          seeders: finiteNumber(hit.seeders),
          leechers: finiteNumber(hit.peers),
          category: String(hit.category || "").trim() || undefined,
          originSource: origin || undefined,
          trackerCount: magnetTrackerCount(magnet),
          grabs: finiteNumber(hit.grabs),
          lastSeenAt: hit.lastSeen || undefined,
          metadataCheckedAt,
          riskScore,
          riskFlags:
            typeof riskScore === "number" && riskScore >= 0.2
              ? ["来源风险提示"]
              : undefined,
          sources: sourceNames("Knaben", origin),
        }),
        links: [{ type: "magnet", url: magnet, password: "" }],
      });
    }

    for (const item of apiBayItems) {
      const title = String(item.name || "").trim();
      const normalizedHash = magnetInfoHash(
        `magnet:?xt=urn:btih:${String(item.info_hash || "")}`
      );
      if (!title || !normalizedHash || !isStrictTitleMatch(title, keyword)) continue;
      const magnet = buildMagnet(normalizedHash, title);
      const bytes = finiteNumber(item.size);
      add({
        message_id: "",
        unique_id: `magnet-${normalizedHash}`,
        channel: "The Pirate Bay",
        datetime: unixDate(item.added),
        title,
        content: "",
        source: "The Pirate Bay",
        metadata: enrichTorrentMetadata(title, "", {
          size: bytes ? formatTorrentSize(bytes) : undefined,
          sizeBytes: bytes,
          infoHash: normalizedHash,
          seeders: finiteNumber(item.seeders),
          leechers: finiteNumber(item.leechers),
          fileCount: finiteNumber(item.num_files),
          category: String(item.category || "").trim() || undefined,
          verified: /vip|trusted/i.test(String(item.status || "")) || undefined,
          trackerCount: TRACKERS.length,
          lastSeenAt: metadataCheckedAt,
          metadataCheckedAt,
          sources: ["The Pirate Bay"],
        }),
        links: [{ type: "magnet", url: magnet, password: "" }],
      });
    }

    for (const item of torrentsCsvItems) {
      const title = String(item.name || "").trim();
      const normalizedHash = magnetInfoHash(
        `magnet:?xt=urn:btih:${String(item.infohash || "")}`
      );
      if (!title || !normalizedHash || !isStrictTitleMatch(title, keyword)) continue;
      const magnet = buildMagnet(normalizedHash, title);
      const bytes = finiteNumber(item.size_bytes);
      add({
        message_id: "",
        unique_id: `magnet-${normalizedHash}`,
        channel: "Torrents-CSV",
        datetime: unixDate(item.created_unix),
        title,
        content: "",
        source: "Torrents-CSV",
        metadata: enrichTorrentMetadata(title, "", {
          size: bytes ? formatTorrentSize(bytes) : undefined,
          sizeBytes: bytes,
          infoHash: normalizedHash,
          seeders: finiteNumber(item.seeders),
          leechers: finiteNumber(item.leechers),
          completed: finiteNumber(item.completed),
          trackerCount: TRACKERS.length,
          lastSeenAt: unixDate(item.scraped_date) || metadataCheckedAt,
          metadataCheckedAt,
          sources: ["Torrents-CSV"],
        }),
        links: [{ type: "magnet", url: magnet, password: "" }],
      });
    }

    for (const item of torrentDownloadsItems) {
      const title = String(item.title || "").trim();
      const normalizedHash = magnetInfoHash(
        `magnet:?xt=urn:btih:${String(item.infoHash || "")}`
      );
      if (!title || !normalizedHash || !isStrictTitleMatch(title, keyword)) continue;
      const magnet = buildMagnet(normalizedHash, title);
      const bytes = finiteNumber(item.size);
      add({
        message_id: "",
        unique_id: `magnet-${normalizedHash}`,
        channel: "TorrentDownloads",
        datetime: item.publishedAt || "",
        title,
        content: "",
        source: "TorrentDownloads",
        metadata: enrichTorrentMetadata(title, "", {
          size: bytes ? formatTorrentSize(bytes) : undefined,
          sizeBytes: bytes,
          infoHash: normalizedHash,
          seeders: finiteNumber(item.seeders),
          leechers: finiteNumber(item.leechers),
          category: item.category || undefined,
          originSource: "TorrentDownloads",
          trackerCount: TRACKERS.length,
          lastSeenAt: metadataCheckedAt,
          metadataCheckedAt,
          sources: ["TorrentDownloads"],
        }),
        links: [{ type: "magnet", url: magnet, password: "" }],
      });
    }

    const results = [...byHash.values()]
      .sort(
        (left, right) =>
          scoreTorrentResult(right, keyword) -
          scoreTorrentResult(left, keyword)
      )
      .slice(0, 120);
    if (results.length) {
      await writeMagnetSearchCache(database, this.name(), keyword, results);
      return results;
    }
    return cached?.results || [];
  }
}
