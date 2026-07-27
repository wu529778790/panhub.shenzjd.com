export type LinkHealthStatus =
  | "unknown"
  | "alive"
  | "dead"
  | "password"
  | "suspect";
export type LinkHealthReportStatus = "alive" | "dead" | "password";

export interface LinkHealthInfo {
  url: string;
  normalizedUrl: string;
  platform: string;
  status: LinkHealthStatus;
  failCount: number;
  successCount: number;
  checkedAt: number;
  reason?: string;
  confidence?: number;
  source?: "community" | "automatic";
}

const PLATFORM_HOSTS: Array<[string, string]> = [
  ["pan.quark.cn", "quark"],
  ["alipan.com", "aliyun"],
  ["aliyundrive.com", "aliyun"],
  ["pan.baidu.com", "baidu"],
  ["115.com", "115"],
  ["115cdn.com", "115"],
  ["anxia.com", "115"],
  ["cloud.189.cn", "tianyi"],
  ["pan.xunlei.com", "xunlei"],
  ["drive.uc.cn", "uc"],
  ["yun.139.com", "mobile"],
  ["123pan.com", "123"],
  ["123865.com", "123"],
  ["123684.com", "123"],
  ["123912.com", "123"],
  ["mypikpak.com", "pikpak"],
  ["lanzou.com", "lanzou"],
  ["lanzoux.com", "lanzou"],
  ["lanzoui.com", "lanzou"],
  ["lanzoub.com", "lanzou"],
  ["lanzoue.com", "lanzou"],
  ["guangyapan.com", "others"],
];

function matchesHost(hostname: string, expected: string): boolean {
  return hostname === expected || hostname.endsWith(`.${expected}`);
}

export function getLinkPlatform(value: string): string | null {
  if (/^magnet:\?xt=urn:btih:[a-z0-9]{32,40}/i.test(value.trim())) {
    return "magnet";
  }
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return PLATFORM_HOSTS.find(([host]) => matchesHost(hostname, host))?.[1] || null;
  } catch {
    return null;
  }
}

export function normalizeLinkHealthUrl(value: string): string | null {
  if (typeof value !== "string" || value.length > 2_048) return null;
  const magnetHash = value
    .trim()
    .match(/(?:^|[?&])xt=urn:btih:([a-z0-9]{32,40})/i)?.[1];
  if (magnetHash) return `magnet:${magnetHash.toLowerCase()}`;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!getLinkPlatform(url.href)) return null;
    url.hash = "";
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.href;
  } catch {
    return null;
  }
}

export function linkHealthKey(value: string): string {
  return normalizeLinkHealthUrl(value) || value.trim();
}
