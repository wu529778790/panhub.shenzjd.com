import {
  classifyShareUrl,
  cleanResourceTitle,
  extractSharePassword,
  normalizeCatalogUrl,
  type ShareType,
} from "../../../utils/sourceContent";

export interface CatalogItem {
  normalizedUrl: string;
  url: string;
  type: ShareType;
  password: string;
  title: string;
  category: string;
}

export interface ParseCatalogOptions {
  category: string;
  fallbackTitle?: string;
}

interface OpenDataRow {
  ScrName?: unknown;
  Scrurl?: unknown;
  Scrpass?: unknown;
}

interface OpenDataPayload {
  code?: unknown;
  Data?: unknown;
}

interface ApiResourceRow {
  title?: unknown;
  url?: unknown;
  updated_at?: unknown;
}

interface ApiResourcePayload {
  success?: unknown;
  code?: unknown;
  data?: {
    data?: unknown;
    page?: unknown;
    page_size?: unknown;
    total?: unknown;
  };
}

export interface ApiResourcePage {
  items: CatalogItem[];
  page: number;
  pageSize: number;
  total: number;
  headUpdatedAt: string;
}

const URL_PATTERN = /magnet:\?xt=urn:btih:[a-z0-9]{32,40}[^\s<>"'`）】]*|https?:\/\/[^\s<>"'`）】]+/gi;
const PLATFORM_WORDS = /(?:☁️|🧲|📺|夸克网盘|夸克|百度网盘|百度|迅雷云盘|迅雷网盘|迅雷|阿里云盘|阿里|115网盘|115盘|UC网盘|PikPak|磁力链接|网盘链接|资源链接|下载地址|链接|点击下载)/gi;

function cleanOpenDataTitle(value: unknown): string {
  return cleanResourceTitle(
    String(value || "")
      .replace(/<[^>]*>/g, "")
      .replace(/([\p{Script=Han}])\s+(?=[\p{Script=Han}])/gu, "$1")
      .replace(/\s+/g, " ")
      .trim(),
    ""
  );
}

export function parseOpenDataFeed(
  payload: OpenDataPayload,
  category = "实时分享"
): CatalogItem[] {
  if (Number(payload?.code) !== 200 || !Array.isArray(payload?.Data)) return [];

  const items = new Map<string, CatalogItem>();
  for (const value of payload.Data) {
    const row = (value || {}) as OpenDataRow;
    const title = cleanOpenDataTitle(row.ScrName);
    const url = String(row.Scrurl || "").trim();
    const type = classifyShareUrl(url);
    const normalizedUrl = normalizeCatalogUrl(url);
    if (!title || !type || !normalizedUrl) continue;

    const suppliedPassword = String(row.Scrpass || "").trim().slice(0, 16);
    const incoming: CatalogItem = {
      normalizedUrl,
      url,
      type,
      password: suppliedPassword || extractSharePassword(url),
      title,
      category,
    };
    const existing = items.get(normalizedUrl);
    if (!existing || incoming.title.length > existing.title.length) {
      items.set(normalizedUrl, incoming);
    } else if (!existing.password && incoming.password) {
      existing.password = incoming.password;
      existing.url = incoming.url;
    }
  }
  return Array.from(items.values());
}

export function parseApiResourcePage(
  payload: ApiResourcePayload,
  category = "综合资源"
): ApiResourcePage {
  const rows = Array.isArray(payload?.data?.data)
    ? payload.data.data as ApiResourceRow[]
    : [];
  if (Number(payload?.code) !== 200 || payload?.success !== true) {
    return { items: [], page: 0, pageSize: 0, total: 0, headUpdatedAt: "" };
  }

  const items = new Map<string, CatalogItem>();
  for (const row of rows) {
    const title = cleanResourceTitle(String(row?.title || ""), "");
    const url = String(row?.url || "").trim();
    const type = classifyShareUrl(url);
    const normalizedUrl = normalizeCatalogUrl(url);
    if (!title || !type || !normalizedUrl) continue;

    const incoming: CatalogItem = {
      normalizedUrl,
      url,
      type,
      password: extractSharePassword(url),
      title,
      category,
    };
    const existing = items.get(normalizedUrl);
    if (!existing || incoming.title.length > existing.title.length) {
      items.set(normalizedUrl, incoming);
    } else if (!existing.password && incoming.password) {
      existing.password = incoming.password;
      existing.url = incoming.url;
    }
  }

  return {
    items: Array.from(items.values()),
    page: Math.max(0, Number(payload.data?.page) || 0),
    pageSize: Math.max(0, Number(payload.data?.page_size) || 0),
    total: Math.max(0, Number(payload.data?.total) || 0),
    headUpdatedAt: String(rows[0]?.updated_at || "").trim(),
  };
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function frontmatterTitle(text: string): string {
  const frontmatter = text.match(/^---\s*\n([\s\S]*?)\n---/);
  return (
    frontmatter?.[1]
      ?.match(/^title\s*:\s*["']?(.+?)["']?\s*$/im)?.[1]
      ?.trim() || ""
  );
}

function cleanLineTitle(value: string, fallback: string): string {
  const withoutLabels = value
    .replace(/<Badge\b[^>]*\/?\s*>/gi, " ")
    .replace(/\[[^\]]*\]\s*$/g, " ")
    .replace(PLATFORM_WORDS, " ")
    .replace(/[「」《》【】()（）]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleanResourceTitle(withoutLabels, fallback);
}

function isWeakTitle(value: string): boolean {
  const compact = value.replace(/[^\p{L}\p{N}]+/gu, "");
  return compact.length < 2 || /^(?:资源|分享|下载|地址|网盘|链接)+$/i.test(compact);
}

function findDocumentTitle(text: string, fallback: string): string {
  const fromFrontmatter = frontmatterTitle(text);
  if (fromFrontmatter) return cleanResourceTitle(fromFrontmatter, fallback);
  const heading = text.match(/^#\s+(.+)$/m)?.[1] || "";
  return cleanResourceTitle(heading, fallback);
}

function deriveLineTitle(
  line: string,
  url: string,
  documentTitle: string,
  currentTitle: string
): string {
  const position = line.indexOf(url);
  let candidate = position >= 0 ? line.slice(0, position) : "";
  if (candidate.includes("|")) candidate = candidate.slice(0, candidate.lastIndexOf("|"));

  const suffix = position >= 0 ? line.slice(position + url.length) : "";
  if (isWeakTitle(cleanLineTitle(candidate, "")) && suffix.trim()) {
    candidate = suffix;
  }

  const contextual =
    currentTitle !== documentTitle && /(?:网盘链接|资源链接|下载链接)/.test(line)
      ? currentTitle
      : [documentTitle, currentTitle]
          .filter(Boolean)
          .filter((value, index, values) => values.indexOf(value) === index)
          .join(" ");
  const title = cleanLineTitle(candidate, contextual || documentTitle);
  return isWeakTitle(title) ? contextual || documentTitle : title;
}

export function parseCatalogDocument(
  rawText: string,
  options: ParseCatalogOptions
): CatalogItem[] {
  const text = decodeHtml(String(rawText || "").replace(/\r\n?/g, "\n"));
  const fallbackTitle = options.fallbackTitle || options.category || "资源分享";
  const documentTitle = findDocumentTitle(text, fallbackTitle);
  let currentTitle = documentTitle;
  const items = new Map<string, CatalogItem>();

  for (const line of text.split("\n")) {
    const heading = line.match(/^\s*#{1,6}\s+(.+?)\s*$/)?.[1];
    const resourceName = line.match(/资源名\s*\**\s*[：:]\s*(.+?)\s*$/)?.[1];
    const boldSection = line.match(/^\s*\*\*([^*]{1,120})\*\*/)?.[1];
    if (heading && !/^资源链接|下载地址$/i.test(heading)) {
      currentTitle = cleanResourceTitle(heading, documentTitle);
    } else if (resourceName) {
      currentTitle = cleanResourceTitle(resourceName, documentTitle);
    } else if (boldSection && !PLATFORM_WORDS.test(boldSection)) {
      currentTitle = cleanResourceTitle(boldSection, documentTitle);
    }
    PLATFORM_WORDS.lastIndex = 0;

    const matches = line.match(URL_PATTERN) || [];
    for (const rawUrl of matches) {
      const url = rawUrl.replace(/[)>）】}\],，。；;]+$/g, "");
      const type = classifyShareUrl(url);
      const normalizedUrl = normalizeCatalogUrl(url);
      if (!type || !normalizedUrl) continue;
      const title = deriveLineTitle(line, rawUrl, documentTitle, currentTitle);
      const incoming: CatalogItem = {
        normalizedUrl,
        url,
        type,
        password: extractSharePassword(url, line),
        title,
        category: options.category,
      };
      const existing = items.get(normalizedUrl);
      if (!existing || incoming.title.length > existing.title.length) {
        items.set(normalizedUrl, incoming);
      } else if (!existing.password && incoming.password) {
        existing.password = incoming.password;
        existing.url = incoming.url;
      }
    }
  }

  return Array.from(items.values());
}

export function extractLinkedMarkdownPaths(readme: string): string[] {
  const paths = new Set<string>();
  for (const match of String(readme || "").matchAll(/\[[^\]]+\]\(([^)]+\.md)\)/gi)) {
    const path = match[1]?.trim();
    if (path && !/^https?:/i.test(path) && !path.includes("..")) paths.add(path);
  }
  return Array.from(paths);
}

function parseOctal(bytes: Uint8Array): number {
  const text = new TextDecoder().decode(bytes).replace(/\0.*$/, "").trim();
  return parseInt(text || "0", 8) || 0;
}

function parsePaxPath(text: string): string {
  for (const line of text.split("\n")) {
    const value = line.match(/^\d+\s+path=(.+)$/)?.[1];
    if (value) return value;
  }
  return "";
}

export function readTarTextFiles(
  archive: ArrayBuffer,
  accepts: (path: string) => boolean
): Array<{ path: string; text: string }> {
  const bytes = new Uint8Array(archive);
  const decoder = new TextDecoder();
  const files: Array<{ path: string; text: string }> = [];
  let offset = 0;
  let paxPath = "";

  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every((value) => value === 0)) break;
    const name = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, "");
    const prefix = decoder.decode(header.subarray(345, 500)).replace(/\0.*$/, "");
    const size = parseOctal(header.subarray(124, 136));
    const type = String.fromCharCode(header[156] || 0);
    const path = paxPath || (prefix ? `${prefix}/${name}` : name);
    const contentStart = offset + 512;
    const contentEnd = Math.min(bytes.length, contentStart + size);

    if (type === "x") {
      paxPath = parsePaxPath(decoder.decode(bytes.subarray(contentStart, contentEnd)));
    } else {
      if ((type === "0" || type === "\0") && size <= 2_000_000 && accepts(path)) {
        files.push({
          path,
          text: decoder.decode(bytes.subarray(contentStart, contentEnd)),
        });
      }
      paxPath = "";
    }
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  return files;
}
