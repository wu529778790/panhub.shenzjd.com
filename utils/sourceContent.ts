const GENERIC_TITLE_PATTERN = /^(?:链接|下载地址|网盘链接|资源链接|点击下载|打开链接|夸克(?:网盘)?|百度(?:网盘)?|迅雷(?:网盘|云盘)?|阿里(?:云盘)?|115(?:网盘)?|UC(?:网盘)?|PikPak|磁力链接|资源)$/i;
const KNOWN_FALSE_POSITIVES: Array<[string, string]> = [
  ["塞尔达", "格丽塞尔达"],
];

export function normalizeSearchText(value: string): string {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function isStrictTitleMatch(title: string, keyword: string): boolean {
  const normalizedTitle = normalizeSearchText(title);
  const normalizedKeyword = normalizeSearchText(keyword);
  if (!normalizedTitle || !normalizedKeyword) return false;
  if (
    KNOWN_FALSE_POSITIVES.some(
      ([query, falseTitle]) =>
        normalizedKeyword === query && normalizedTitle.includes(falseTitle)
    )
  ) return false;
  if (normalizedTitle.includes(normalizedKeyword)) return true;

  const terms = String(keyword || "")
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map(normalizeSearchText)
    .filter((term) => term.length > 1);
  if (terms.length <= 1) return false;

  // 英文别名不能只判断“所有单词都在标题里”。例如 three body 会误中
  // "Three ... Body" 的成人标题。要求完整单词按顺序且相距不超过 4 个词，
  // 同时仍允许 "Harry Potter BluRay 4K" 这类带少量版本信息的标题。
  if (terms.every((term) => /^[a-z0-9]+$/i.test(term))) {
    const titleTerms = String(title || "")
      .normalize("NFKC")
      .toLowerCase()
      .match(/[a-z0-9]+/g) || [];
    let cursor = 0;
    let firstIndex = -1;
    let lastIndex = -1;
    for (const term of terms) {
      const relativeIndex = titleTerms.slice(cursor).findIndex(
        (candidate) => candidate === term
      );
      if (relativeIndex < 0) return false;
      const index = cursor + relativeIndex;
      if (firstIndex < 0) firstIndex = index;
      lastIndex = index;
      cursor = index + 1;
    }
    return lastIndex - firstIndex <= terms.length + 4;
  }

  return terms.every((term) => normalizedTitle.includes(term));
}

export function cleanResourceTitle(value: string, fallback = "资源分享"): string {
  const cleaned = String(value || "")
    .replace(/超过\s*100T资料总站网站[-—_ ]*doc\.869hr\.uk/gi, "")
    .replace(/(?:https?:\/\/|magnet:\?)[^\s)）】>]+/gi, "")
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[>*_`#]/g, " ")
    .replace(/^\s*[-+|｜:：·•—–]+\s*/, "")
    .replace(/\s*[|｜]\s*$/, "")
    .replace(/\s*[-—_ |｜:：·•–]+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || GENERIC_TITLE_PATTERN.test(cleaned)) return fallback;
  return cleaned.slice(0, 240);
}

export type ShareType =
  | "aliyun"
  | "quark"
  | "baidu"
  | "115"
  | "xunlei"
  | "uc"
  | "tianyi"
  | "123"
  | "mobile"
  | "pikpak"
  | "lanzou"
  | "magnet"
  | "others";

export function classifyShareUrl(value: string): ShareType | null {
  const raw = String(value || "").trim();
  if (/^magnet:\?xt=urn:btih:[a-z0-9]{32,40}/i.test(raw)) return "magnet";
  try {
    const host = new URL(raw).hostname.toLowerCase();
    const matches = (expected: string) =>
      host === expected || host.endsWith(`.${expected}`);
    if (matches("pan.quark.cn")) return "quark";
    if (matches("pan.baidu.com")) return "baidu";
    if (matches("115.com") || matches("115cdn.com") || matches("anxia.com")) return "115";
    if (matches("pan.xunlei.com")) return "xunlei";
    if (matches("drive.uc.cn")) return "uc";
    if (matches("alipan.com") || matches("aliyundrive.com")) return "aliyun";
    if (matches("cloud.189.cn")) return "tianyi";
    if (
      matches("123pan.com") ||
      matches("123pan.cn") ||
      matches("123865.com") ||
      matches("123684.com") ||
      matches("123912.com") ||
      matches("123685.com") ||
      matches("123592.com")
    ) return "123";
    if (matches("yun.139.com")) return "mobile";
    if (matches("mypikpak.com")) return "pikpak";
    if (/(?:^|\.)lanzou[a-z]?\.com$/i.test(host)) return "lanzou";
    if (matches("guangyapan.com")) return "others";
    if (matches("share.weiyun.com") || matches("ctfile.com")) return "others";
  } catch {
    return null;
  }
  return null;
}

export function normalizeCatalogUrl(value: string): string {
  const raw = String(value || "")
    .trim()
    .replace(/[)>）】}\],，。；;]+$/g, "");
  const hash = /^magnet:\?/i.test(raw)
    ? raw.match(/(?:^|[?&])xt=urn:btih:([a-z0-9]{32,40})/i)?.[1]
    : "";
  if (hash) return `magnet:${hash.toLowerCase()}`;
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return "";
    url.hostname = url.hostname.toLowerCase();
    url.hash = "";
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.href;
  } catch {
    return "";
  }
}

export function extractSharePassword(value: string, context = ""): string {
  try {
    const url = new URL(value);
    for (const key of ["pwd", "password", "code", "p"]) {
      const found = url.searchParams.get(key)?.trim();
      if (found) return found.slice(0, 16);
    }
  } catch {}
  return (
    context.match(/(?:提取码|访问密码|密码)\s*[:：]?\s*([a-z0-9]{4,16})/i)?.[1] || ""
  );
}
