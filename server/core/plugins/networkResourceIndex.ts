import { BaseAsyncPlugin } from "./manager";
import type { Link, SearchResult } from "../types/models";
import {
  classifyShareUrl,
  cleanResourceTitle,
  extractSharePassword,
  isStrictTitleMatch,
  normalizeCatalogUrl,
} from "../../../utils/sourceContent";

const SEARCH_ENDPOINT = "https://pansearch.123cf.top/task_suggestions";
const MAX_RESULTS = 20;

interface NetworkResourceRow {
  taskname?: unknown;
  shareurl?: unknown;
}

function requestedTypes(ext: Record<string, any>): Set<string> | undefined {
  if (!Array.isArray(ext.__cloud_types) || ext.__cloud_types.length === 0) {
    return undefined;
  }
  return new Set(
    ext.__cloud_types
      .map((value: unknown) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  );
}

function extractEmbeddedMagnet(value: string): string {
  try {
    const decodedUrl = value.replace(/&amp;/gi, "&");
    const embedded = new URL(decodedUrl).searchParams.get("__add_url") || "";
    return /^magnet:\?xt=urn:btih:[a-z0-9]{32,40}/i.test(embedded)
      ? embedded
      : "";
  } catch {
    return "";
  }
}

function rowLinks(
  value: string,
  allow: Set<string> | undefined
): Array<Link & { normalizedUrl: string }> {
  const candidates = [value, extractEmbeddedMagnet(value)].filter(Boolean);
  const links: Array<Link & { normalizedUrl: string }> = [];
  const seen = new Set<string>();
  for (const url of candidates) {
    const type = classifyShareUrl(url);
    const normalizedUrl = normalizeCatalogUrl(url);
    if (!type || !normalizedUrl || seen.has(normalizedUrl)) continue;
    if (allow && !allow.has(type)) continue;
    seen.add(normalizedUrl);
    links.push({
      type,
      url,
      password: extractSharePassword(url),
      normalizedUrl,
    });
  }
  return links;
}

export function parseNetworkResourcePayload(
  payload: unknown,
  keyword: string,
  ext: Record<string, any> = {}
): SearchResult[] {
  if (!Array.isArray(payload)) return [];

  const allow = requestedTypes(ext);
  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const value of payload) {
    const row = (value || {}) as NetworkResourceRow;
    const title = cleanResourceTitle(
      String(row.taskname || "")
        .replace(/^\s*(?:名称|资源名称)\s*[:：]\s*/i, "")
        .trim(),
      ""
    );
    if (!title || !isStrictTitleMatch(title, keyword)) continue;

    const links = rowLinks(String(row.shareurl || "").trim(), allow);
    const newLinks = links.filter((link) => !seen.has(link.normalizedUrl));
    if (newLinks.length === 0) continue;
    for (const link of newLinks) seen.add(link.normalizedUrl);

    const uniqueKey = newLinks.map((link) => link.normalizedUrl).join("|");
    results.push({
      message_id: "",
      unique_id: `network-resource-${encodeURIComponent(uniqueKey).slice(0, 180)}`,
      channel: "",
      datetime: "",
      title,
      content: "",
      source: "网络资源索引",
      links: newLinks.map(({ normalizedUrl: _normalizedUrl, ...link }) => link),
    });
    if (results.length >= MAX_RESULTS) break;
  }
  return results;
}

export class NetworkResourceIndexPlugin extends BaseAsyncPlugin {
  constructor() {
    super("网络资源索引", 3);
  }

  timeoutMs(): number {
    return 1600;
  }

  useKeywordVariants(): boolean {
    return false;
  }

  override async search(
    keyword: string,
    ext: Record<string, any> = {}
  ): Promise<SearchResult[]> {
    const query = keyword.trim().slice(0, 120);
    if (!query) return [];

    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set("q", query);
    url.searchParams.set("d", "0");
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0",
      },
      signal: ext.signal as AbortSignal | undefined,
    });
    if (!response.ok) {
      throw new Error(`Network resource index failed with HTTP ${response.status}`);
    }
    return parseNetworkResourcePayload(await response.json(), query, ext);
  }
}
