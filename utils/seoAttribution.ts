export type SeoChannel =
  | "organic"
  | "direct"
  | "referral"
  | "social"
  | "email"
  | "paid"
  | "internal";

export interface SeoAttribution {
  landingPath: string;
  channel: SeoChannel;
  source: string;
  medium: string;
  campaign: string;
}

const SEARCH_ENGINES: Array<[RegExp, string]> = [
  [/(^|\.)google\./i, "google"],
  [/(^|\.)baidu\.com$/i, "baidu"],
  [/(^|\.)bing\.com$/i, "bing"],
  [/(^|\.)so\.com$/i, "360"],
  [/(^|\.)sogou\.com$/i, "sogou"],
  [/(^|\.)sm\.cn$/i, "sm"],
  [/(^|\.)yahoo\./i, "yahoo"],
  [/(^|\.)duckduckgo\.com$/i, "duckduckgo"],
];

function cleanDimension(value: string, fallback: string, maxLength = 64): string {
  const cleaned = String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
  return cleaned || fallback;
}

export function normalizeLandingPath(value: string): string {
  const path = String(value || "/").split(/[?#]/, 1)[0] || "/";
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  const cleaned = path
    .replace(/\/{2,}/g, "/")
    .replace(/[^\w\u4e00-\u9fff%./~-]/g, "")
    .slice(0, 160);
  return cleaned || "/";
}

function referrerHost(value: string): string {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function channelFromMedium(value: string): SeoChannel {
  const medium = value.toLowerCase();
  if (/(cpc|ppc|paid|display|affiliate)/.test(medium)) return "paid";
  if (/(social|community)/.test(medium)) return "social";
  if (/(email|newsletter)/.test(medium)) return "email";
  if (medium === "organic") return "organic";
  if (medium === "referral") return "referral";
  return "referral";
}

export function buildSeoAttribution(input: {
  landingPath?: string;
  referrer?: string;
  siteHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}): SeoAttribution {
  const landingPath = normalizeLandingPath(input.landingPath || "/");
  const utmSource = cleanDimension(input.utmSource || "", "", 48);
  const utmMedium = cleanDimension(input.utmMedium || "", "", 32);
  const campaign = cleanDimension(input.utmCampaign || "", "none", 64);

  if (utmSource || utmMedium) {
    return {
      landingPath,
      channel: channelFromMedium(utmMedium || "referral"),
      source: utmSource || "unknown",
      medium: utmMedium || "referral",
      campaign,
    };
  }

  const host = referrerHost(input.referrer || "");
  const siteHost = String(input.siteHost || "")
    .toLowerCase()
    .replace(/^www\./, "");
  if (!host) {
    return {
      landingPath,
      channel: "direct",
      source: "direct",
      medium: "none",
      campaign: "none",
    };
  }
  if (host === siteHost || host.endsWith(`.${siteHost}`)) {
    return {
      landingPath,
      channel: "internal",
      source: "haosouku",
      medium: "internal",
      campaign: "none",
    };
  }

  const engine = SEARCH_ENGINES.find(([pattern]) => pattern.test(host));
  if (engine) {
    return {
      landingPath,
      channel: "organic",
      source: engine[1],
      medium: "organic",
      campaign: "none",
    };
  }

  return {
    landingPath,
    channel: "referral",
    source: cleanDimension(host, "referral", 64),
    medium: "referral",
    campaign: "none",
  };
}

export function sanitizeSeoAttribution(
  value: Partial<SeoAttribution> | null | undefined
): SeoAttribution {
  const allowedChannels = new Set<SeoChannel>([
    "organic",
    "direct",
    "referral",
    "social",
    "email",
    "paid",
    "internal",
  ]);
  const channel = allowedChannels.has(value?.channel as SeoChannel)
    ? (value?.channel as SeoChannel)
    : "direct";
  return {
    landingPath: normalizeLandingPath(value?.landingPath || "/"),
    channel,
    source: cleanDimension(value?.source || "", channel === "direct" ? "direct" : "unknown", 64),
    medium: cleanDimension(value?.medium || "", channel === "direct" ? "none" : channel, 32),
    campaign: cleanDimension(value?.campaign || "", "none", 64),
  };
}
