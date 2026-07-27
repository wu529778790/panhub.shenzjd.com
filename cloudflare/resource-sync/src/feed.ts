import {
  classifyShareUrl,
  cleanResourceTitle,
  extractSharePassword,
  normalizeCatalogUrl,
} from "../../../utils/sourceContent";
import type { CatalogItem } from "./catalog";

const SHARE_URL_PATTERN =
  /https?:\/\/(?:pan\.baidu\.com|pan\.quark\.cn|115cdn\.com|115\.com|pan\.xunlei\.com|drive\.uc\.cn|(?:www\.)?alipan\.com|(?:www\.)?aliyundrive\.com|cloud\.189\.cn|(?:caiyun|yun)\.139\.com|(?:www\.)?123pan\.com)\/[^\s<>"'`）】]+/gi;

function decodeEntities(value: string): string {
  return value
    .replace(/\\\//g, "/")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function plainText(value: string): string {
  return decodeEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function catalogItem(
  titleValue: string,
  urlValue: string,
  passwordValue: string,
  category: string
): CatalogItem | undefined {
  const url = decodeEntities(urlValue).replace(/[),，。；;]+$/g, "");
  const type = classifyShareUrl(url);
  const normalizedUrl = normalizeCatalogUrl(url);
  const title = cleanResourceTitle(plainText(titleValue), category);
  if (
    !type ||
    !normalizedUrl ||
    title.replace(/[^\p{L}\p{N}]+/gu, "").length < 2
  ) {
    return undefined;
  }
  return {
    normalizedUrl,
    url,
    type,
    password: String(passwordValue || extractSharePassword(url)).trim(),
    title,
    category,
  };
}

function deduplicate(items: CatalogItem[]): CatalogItem[] {
  const byUrl = new Map<string, CatalogItem>();
  for (const item of items) {
    const current = byUrl.get(item.normalizedUrl);
    if (!current || item.title.length > current.title.length) {
      byUrl.set(item.normalizedUrl, item);
    } else if (!current.password && item.password) {
      current.password = item.password;
      current.url = item.url;
    }
  }
  return Array.from(byUrl.values());
}

export function parseSitemapUrls(
  rawXml: string,
  origin: string,
  pathPattern: RegExp,
  locationOrigin = origin
): string[] {
  const expectedOrigin = new URL(locationOrigin).origin;
  const outputOrigin = new URL(origin).origin;
  const urls = new Set<string>();
  for (const match of String(rawXml || "").matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
    try {
      const url = new URL(decodeEntities(match[1].trim()));
      if (url.origin !== expectedOrigin || !pathPattern.test(url.pathname)) continue;
      pathPattern.lastIndex = 0;
      urls.add(new URL(`${url.pathname}${url.search}`, outputOrigin).href);
    } catch {
      pathPattern.lastIndex = 0;
    }
  }
  return Array.from(urls);
}

function detailTitle(html: string, fallback: string): string {
  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
  const pageTitle = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const candidate = plainText(heading || pageTitle)
    .replace(/\s*[-_|]\s*(?:资源下载\s*[-_|]\s*)?(?:大盘搜|啊飞网盘分享|海豚搜索|小鸡窝|热门资源|盘小子|夸克网盘资源分享|夸克资源库|爱搜).*$/i, "")
    .replace(/^(?:资源标题|名称)[：:]\s*/i, "")
    .replace(/资源描述[：:].*$/i, "")
    .trim();
  return cleanResourceTitle(candidate, fallback);
}

export function parsePublicDetailPage(
  rawHtml: string,
  category = "公开增量资源",
  maxItems = Number.POSITIVE_INFINITY,
  preferredResourceKey = ""
): CatalogItem[] {
  const html = decodeEntities(String(rawHtml || ""));
  // Several public QfShop indexes keep deleted rows in their sitemap while
  // exposing the authoritative deletion flag in SSR data. Never re-import
  // those known-dead links into the catalog.
  if (/"is_delete"\s*:\s*(?:1|"1"|true)\b/i.test(html)) return [];
  const title = detailTitle(html, category);
  const items: CatalogItem[] = [];
  if (preferredResourceKey) {
    const escapedKey = preferredResourceKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const marker = new RegExp(`\\bpinyin\\s*:\\s*["']${escapedKey}["']`, "i");
    const markerIndex = html.search(marker);
    if (markerIndex >= 0) {
      const preferredRegion = html.slice(markerIndex, markerIndex + 8_000);
      for (const match of preferredRegion.match(SHARE_URL_PATTERN) || []) {
        const item = catalogItem(title, match, "", category);
        if (item) items.push(item);
      }
      SHARE_URL_PATTERN.lastIndex = 0;
      const preferred = deduplicate(items);
      if (preferred.length > 0) {
        return preferred.slice(0, Math.max(0, maxItems));
      }
    }
  }
  for (const match of html.match(SHARE_URL_PATTERN) || []) {
    const item = catalogItem(title, match, "", category);
    if (item) items.push(item);
  }
  SHARE_URL_PATTERN.lastIndex = 0;
  return deduplicate(items).slice(0, Math.max(0, maxItems));
}
