import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import {
  classifyShareUrl,
  cleanResourceTitle,
  extractSharePassword,
  isStrictTitleMatch,
  normalizeCatalogUrl,
} from "../../../utils/sourceContent";

const SEARCH_ENDPOINT = "https://feapi.xyz/api/sing.php";

interface OpenResourceRow {
  name?: unknown;
  link?: unknown;
  time?: unknown;
}

interface OpenResourcePayload {
  code?: unknown;
  data?: unknown;
}

export function parseOpenResourcePayload(
  payload: OpenResourcePayload,
  keyword: string
): SearchResult[] {
  if (Number(payload?.code) !== 200 || !Array.isArray(payload?.data)) return [];

  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const value of payload.data) {
    const row = (value || {}) as OpenResourceRow;
    const title = cleanResourceTitle(String(row.name || ""), "");
    const url = String(row.link || "").trim();
    const type = classifyShareUrl(url);
    const normalizedUrl = normalizeCatalogUrl(url);
    if (
      !title ||
      !type ||
      !normalizedUrl ||
      seen.has(normalizedUrl) ||
      !isStrictTitleMatch(title, keyword)
    ) {
      continue;
    }

    seen.add(normalizedUrl);
    results.push({
      message_id: "",
      unique_id: `open-resource-${encodeURIComponent(normalizedUrl).slice(0, 180)}`,
      channel: "",
      datetime: String(row.time || "").trim(),
      title,
      content: "",
      source: "开放资源索引",
      links: [
        {
          type,
          url,
          password: extractSharePassword(url),
        },
      ],
    });
  }
  return results.slice(0, 50);
}

export class OpenResourceIndexPlugin extends BaseAsyncPlugin {
  constructor() {
    super("开放资源索引", 2);
  }

  timeoutMs(): number {
    return 2600;
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
    url.searchParams.set("query", query);
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0",
      },
      signal: ext.signal as AbortSignal | undefined,
    });
    if (!response.ok) {
      throw new Error(`Open resource index failed with HTTP ${response.status}`);
    }
    return parseOpenResourcePayload(
      (await response.json()) as OpenResourcePayload,
      query
    );
  }
}
