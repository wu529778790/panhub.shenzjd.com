import { BaseAsyncPlugin } from "./manager";
import type { Link, SearchResult } from "../types/models";
import {
  cleanResourceTitle,
} from "../../../utils/sourceContent";

const SEARCH_URL = "https://haisou.cc/api/v2/shares/search";
const COMMON_SEARCH_PLATFORMS = [
  "ali",
  "baidu",
  "quark",
  "xunlei",
  "tianyi",
  "yidong",
  "uc",
] as const;

const SUPPLEMENTAL_SEARCH_PLATFORMS = [
  "115",
  "123",
  "guangya",
  "lanzou",
  "weiyun",
  "ctfile",
] as const;

const CLOUD_TYPE_PLATFORMS: Record<string, string[]> = {
  aliyun: ["ali"],
  baidu: ["baidu"],
  quark: ["quark"],
  xunlei: ["xunlei"],
  tianyi: ["tianyi"],
  mobile: ["yidong"],
  "115": ["115"],
  "123": ["123"],
  uc: ["uc"],
  lanzou: ["lanzou"],
  others: ["guangya", "weiyun", "ctfile"],
};

const PLATFORM_LINKS: Record<
  string,
  { type: string; baseUrl: string; passwordKey?: string }
> = {
  ali: { type: "aliyun", baseUrl: "https://www.alipan.com/s/" },
  baidu: { type: "baidu", baseUrl: "https://pan.baidu.com/s/", passwordKey: "pwd" },
  quark: { type: "quark", baseUrl: "https://pan.quark.cn/s/" },
  xunlei: { type: "xunlei", baseUrl: "https://pan.xunlei.com/s/", passwordKey: "pwd" },
  tianyi: { type: "tianyi", baseUrl: "https://cloud.189.cn/t/" },
  yidong: { type: "mobile", baseUrl: "https://yun.139.com/shareweb/#/w/i/" },
  "115": { type: "115", baseUrl: "https://115.com/s/", passwordKey: "password" },
  "123": { type: "123", baseUrl: "https://www.123pan.com/s/", passwordKey: "pwd" },
  uc: { type: "uc", baseUrl: "https://drive.uc.cn/s/" },
  guangya: { type: "others", baseUrl: "https://www.guangyapan.com/s/", passwordKey: "code" },
  lanzou: { type: "lanzou", baseUrl: "https://www.lanzoux.com/", passwordKey: "pwd" },
  weiyun: { type: "others", baseUrl: "https://share.weiyun.com/", passwordKey: "pwd" },
  ctfile: { type: "others", baseUrl: "https://url01.ctfile.com/", passwordKey: "p" },
};

interface GlobalIndexItem {
  hsid?: unknown;
  platform?: unknown;
  share_name?: unknown;
  share_code?: unknown;
  share_pwd?: unknown;
  stat_file?: unknown;
  stat_size?: unknown;
}

interface GlobalIndexPayload {
  success?: boolean;
  data?: { items?: GlobalIndexItem[] };
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function cleanGlobalIndexTitle(value: unknown): string {
  const plainText = decodeEntities(String(value || ""))
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleanResourceTitle(plainText, "");
}

export function buildGlobalIndexLink(
  platformValue: unknown,
  codeValue: unknown,
  passwordValue: unknown
): Link | null {
  const platform = String(platformValue || "").trim().toLowerCase();
  const code = String(codeValue || "").trim();
  const password = String(passwordValue || "").trim().slice(0, 16);
  const definition = PLATFORM_LINKS[platform];
  if (!definition || !code || code.length > 180) return null;

  const url = new URL(`${definition.baseUrl}${encodeURIComponent(code)}`);
  if (password && definition.passwordKey) {
    url.searchParams.set(definition.passwordKey, password);
  }
  return { type: definition.type, url: url.href, password };
}

export function parseGlobalIndexPayload(payload: GlobalIndexPayload): SearchResult[] {
  if (!payload?.success || !Array.isArray(payload.data?.items)) return [];

  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const item of payload.data.items) {
    const title = cleanGlobalIndexTitle(item.share_name);
    const link = buildGlobalIndexLink(
      item.platform,
      item.share_code,
      item.share_pwd
    );
    if (!title || !link) continue;

    const uniqueKey = `${link.type}:${link.url.toLowerCase()}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    const files = Number(item.stat_file);
    const bytes = Number(item.stat_size);
    const details = [
      Number.isFinite(files) && files > 0 ? `${files} 个文件` : "",
      Number.isFinite(bytes) && bytes > 0 ? formatBytes(bytes) : "",
    ].filter(Boolean);
    const sourceId = String(item.hsid || item.share_code || results.length);
    results.push({
      message_id: "",
      unique_id: `global-index-${sourceId}`,
      channel: "",
      datetime: "",
      title,
      content: details.join(" · "),
      source: "全网索引",
      links: [link],
    });
  }
  return results;
}

function requestedPlatformGroups(ext: Record<string, any>): string[][] {
  const cloudTypes = Array.isArray(ext.__cloud_types)
    ? ext.__cloud_types.map((value: unknown) =>
        String(value || "").trim().toLowerCase()
      )
    : [];
  if (cloudTypes.length === 0) {
    return [
      [...COMMON_SEARCH_PLATFORMS],
      [...SUPPLEMENTAL_SEARCH_PLATFORMS],
    ];
  }

  const platforms = [
    ...new Set(
      cloudTypes.flatMap(
        (type: string) => CLOUD_TYPE_PLATFORMS[type] || []
      )
    ),
  ];
  return platforms.length > 0 ? [platforms] : [];
}

function mergeGlobalIndexResults(groups: SearchResult[][]): SearchResult[] {
  const merged = new Map<string, SearchResult>();
  for (const result of groups.flat()) {
    const link = result.links[0];
    if (!link) continue;
    const key = `${link.type}:${link.url.toLowerCase()}`;
    if (!merged.has(key)) merged.set(key, result);
  }
  return [...merged.values()];
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export class GlobalIndexPlugin extends BaseAsyncPlugin {
  constructor() {
    super("全网索引", 3);
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
    const query = keyword.trim().slice(0, 120);
    if (!query) return [];
    const platformGroups = requestedPlatformGroups(ext);
    if (platformGroups.length === 0) return [];

    const requests = await Promise.allSettled(
      platformGroups.map(async (platforms) => {
        const response = await fetch(SEARCH_URL, {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            query,
            filters: {
              scope: "title",
              platforms,
              include_filtered: true,
              min_size: null,
              max_size: null,
            },
            pagination: { page: 1, page_size: 20 },
          }),
          signal: ext.signal as AbortSignal | undefined,
        });
        if (!response.ok) {
          throw new Error(
            `Global index search failed with HTTP ${response.status}`
          );
        }
        return parseGlobalIndexPayload(
          (await response.json()) as GlobalIndexPayload
        );
      })
    );
    const successful = requests.filter(
      (request): request is PromiseFulfilledResult<SearchResult[]> =>
        request.status === "fulfilled"
    );
    if (successful.length === 0) {
      const failed = requests.find(
        (request): request is PromiseRejectedResult =>
          request.status === "rejected"
      );
      throw failed?.reason || new Error("Global index search failed");
    }
    return mergeGlobalIndexResults(
      successful.map((request) => request.value)
    );
  }
}
