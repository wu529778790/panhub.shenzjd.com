import type { TorrentMetadata } from "../types/search";

const SIZE_UNITS: Record<string, number> = {
  b: 1,
  kb: 1_000,
  kib: 1_024,
  mb: 1_000_000,
  mib: 1_048_576,
  gb: 1_000_000_000,
  gib: 1_073_741_824,
  tb: 1_000_000_000_000,
  tib: 1_099_511_627_776,
};

const ADULT_CONTENT_PATTERNS = [
  /(?:色情|情色|无码|有码破解|成人(?:影片|电影|视频|资源|内容)|女优|里番|巨乳|乳交|颜射|内射|乱伦|强奸|轮奸|换妻|群交|自慰|约炮|调教|肉棒|嫩穴|鲍鱼|偷拍|裸体|裸露|性爱|无套|鸡巴|阴茎|阴道|操逼|骚穴|榨精|射精|双飞)/i,
  /(?:R-?18|無修正|成年コミック|エロ|エッチ|アダルト|レイプ|中出し|痴女|巨乳|爆乳|ハメ|陵辱)/i,
  /\b(?:xxx|porn(?:ography)?|hentai|nsfw|jav|uncensored|onlyfans|adult[ ._-]?(?:video|movie|content)|gangbang|incest|blowjob|creampie|camgirl|sex|nude|naked|erotic|milf|bdsm|fuck(?:ing)?|sluts?|tits?|threesome|orgasm|lesbian)\b/i,
  /\b(?:snis|ssni|ssis|mide|midv|ipx|ipzz|abp|pred|stars|jufd|juq|dasd|miaa|meyd|rbd|soe|ebod|avop|cjod|rct|mxgs|pmp)-?\d{2,6}\b/i,
] as const;

/** 仅标记明确的成人内容，不把成人教育、人体课程等普通内容误判为成人资源。 */
export function isAdultContent(title: string, content = ""): boolean {
  const text = `${title || ""} ${content || ""}`;
  return ADULT_CONTENT_PATTERNS.some((pattern) => pattern.test(text));
}

function cleanText(value?: string): string | undefined {
  const text = String(value || "").trim();
  return text || undefined;
}

function firstMatch(text: string, patterns: Array<[RegExp, string]>): string | undefined {
  return patterns.find(([pattern]) => pattern.test(text))?.[1];
}

function uniqueStrings(...values: Array<string[] | undefined>): string[] | undefined {
  const result = [...new Set(values.flatMap((value) => value || []).map((value) => value.trim()).filter(Boolean))];
  return result.length ? result : undefined;
}

function maxDefined(...values: Array<number | undefined>): number | undefined {
  const numbers = values.filter((value): value is number => Number.isFinite(value));
  return numbers.length ? Math.max(...numbers) : undefined;
}

function newestDate(...values: Array<string | undefined>): string | undefined {
  return values
    .filter((value): value is string => Boolean(value && Number.isFinite(Date.parse(value))))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
}

export function magnetTrackerCount(url: string): number {
  try {
    return new URL(url).searchParams.getAll("tr").filter(Boolean).length;
  } catch {
    return 0;
  }
}

function normalizeBtih(value: string): string | undefined {
  const hash = String(value || "").trim();
  if (/^[a-f0-9]{40}$/i.test(hash)) return hash.toLowerCase();
  if (!/^[a-z2-7]{32}$/i.test(hash)) return undefined;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let buffer = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const character of hash.toUpperCase()) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) return undefined;
    buffer = (buffer << 5) | digit;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >>> bits) & 0xff);
      buffer &= bits > 0 ? (1 << bits) - 1 : 0;
    }
  }
  if (bytes.length !== 20) return undefined;
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function withTorrentAvailability(
  metadata: TorrentMetadata,
  now = Date.now()
): TorrentMetadata {
  const checkedAt = Date.parse(metadata.metadataCheckedAt || metadata.lastSeenAt || "");
  const ageHours = Number.isFinite(checkedAt)
    ? Math.max(0, (now - checkedAt) / 3_600_000)
    : Infinity;
  const seeders = metadata.seeders;
  const risky =
    (metadata.riskFlags?.length || 0) > 0 || Number(metadata.riskScore || 0) >= 0.2;
  let availabilityStatus: TorrentMetadata["availabilityStatus"] = "unknown";
  if (risky) availabilityStatus = "risky";
  else if (!Number.isFinite(checkedAt)) availabilityStatus = "unknown";
  else if (ageHours > 7 * 24) availabilityStatus = "stale";
  else if (seeders === 0) availabilityStatus = "cold";
  else if (typeof seeders === "number" && seeders > 0) availabilityStatus = "active";

  const freshness = ageHours <= 24 ? 1 : ageHours <= 72 ? 0.8 : ageHours <= 168 ? 0.55 : 0.2;
  const swarmScore = typeof seeders === "number"
    ? Math.min(80, (Math.log2(Math.max(0, seeders) + 1) / Math.log2(1001)) * 80)
    : 10;
  const sourceScore = Math.min(10, (metadata.sources?.length || 0) * 4);
  const verificationScore = metadata.verified ? 10 : 0;
  const riskPenalty = risky ? 45 : 0;
  const availabilityScore = Math.max(
    0,
    Math.min(100, Math.round((swarmScore + sourceScore + verificationScore) * freshness - riskPenalty))
  );
  return { ...metadata, availabilityStatus, availabilityScore };
}

export function parseTorrentSize(value?: string | number): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
  }

  const match = String(value || "").trim().match(/([\d,.]+)\s*(b|kb|kib|mb|mib|gb|gib|tb|tib)\b/i);
  if (!match) return undefined;
  const amount = Number(match[1]?.replace(/,/g, ""));
  const multiplier = SIZE_UNITS[String(match[2]).toLowerCase()];
  if (!Number.isFinite(amount) || !multiplier) return undefined;
  return Math.round(amount * multiplier);
}

export function formatTorrentSize(bytes?: number): string {
  if (!Number.isFinite(bytes) || Number(bytes) <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = Number(bytes);
  let index = 0;
  while (size >= 1000 && index < units.length - 1) {
    size /= 1000;
    index += 1;
  }
  const digits = size >= 100 || index === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(digits)} ${units[index]}`;
}

export function magnetInfoHash(url: string): string | undefined {
  const value = String(url || "").trim();
  const hash = value.match(/(?:^|[?&])xt=urn:btih:([a-z0-9]{32,40})/i)?.[1];
  return hash ? normalizeBtih(hash) : undefined;
}

export function normalizeMagnetKey(url: string): string {
  const value = String(url || "").trim();
  const hash = magnetInfoHash(value);
  return hash ? `magnet:${hash}` : value.replace(/\/$/, "").toLowerCase();
}

export function inferTorrentMetadata(title: string, content = ""): TorrentMetadata {
  const text = `${title || ""} ${content || ""}`;
  const lower = text.toLowerCase();
  const sizeText = content.match(/(?:size|大小)\s*[:：]\s*([\d,.]+\s*(?:[kmgt]i?b|b))/i)?.[1];
  const seeders = content.match(/(?:seeders?|做种)\s*[:：]\s*(\d+)/i)?.[1];
  const leechers = content.match(/(?:leechers?|下载中)\s*[:：]\s*(\d+)/i)?.[1];
  const completed = content.match(/(?:completed|downloads?|完成)\s*[:：]\s*(\d+)/i)?.[1];
  const fileCount = content.match(/(?:files?|文件数)\s*[:：]\s*(\d+)/i)?.[1];
  const seasonEpisode = text.match(/\bS\d{1,2}(?:E\d{1,3}(?:[-_. ]?E?\d{1,3})?)?\b/i)?.[0]
    || text.match(/第\s*\d{1,2}\s*季(?:\s*第\s*\d{1,3}\s*集)?/)?.[0];
  const yearValue = text.match(/(?:^|[^\d])((?:19|20)\d{2})(?!\d)/)?.[1];
  const fileType = text.match(/\.(mkv|mp4|mov|avi|wmv|ts|m2ts|iso|zip|rar|7z|pdf|epub|mobi|flac|mp3|wav|apk|exe)\b/i)?.[1];
  const languages: string[] = [];
  if (/国语|普通话|mandarin/i.test(text)) languages.push("国语");
  if (/粤语|cantonese/i.test(text)) languages.push("粤语");
  if (/中字|简中|chs\b|zh-cn/i.test(text)) languages.push("中字");
  if (/繁中|cht\b|zh-tw/i.test(text)) languages.push("繁中");
  if (/双语|dual[ ._-]?audio|multi[ ._-]?audio/i.test(text)) languages.push("双语");

  const sizeBytes = parseTorrentSize(sizeText);
  return {
    adult: isAdultContent(title, content) || undefined,
    size: cleanText(sizeText) || (sizeBytes ? formatTorrentSize(sizeBytes) : undefined),
    sizeBytes,
    seeders: seeders === undefined ? undefined : Number(seeders),
    leechers: leechers === undefined ? undefined : Number(leechers),
    completed: completed === undefined ? undefined : Number(completed),
    fileCount: fileCount === undefined ? undefined : Number(fileCount),
    resolution: firstMatch(lower, [
      [/\b(?:4320p|8k)\b/i, "8K"],
      [/\b(?:2160p|4k|uhd)\b/i, "4K"],
      [/\b(?:1080p|1080i|fhd)\b/i, "1080P"],
      [/\b720p\b/i, "720P"],
    ]),
    releaseType: firstMatch(lower, [
      [/\bremux\b/i, "REMUX"],
      [/\b(?:blu[ ._-]?ray|bdrip|bdremux)\b/i, "BluRay"],
      [/\bweb[ ._-]?dl\b/i, "WEB-DL"],
      [/\bweb[ ._-]?rip\b/i, "WEBRip"],
      [/\bhdtv\b/i, "HDTV"],
      [/\b(?:dvdrip|dvd)\b/i, "DVD"],
      [/\b(?:cam|hdcam|telesync)\b/i, "CAM"],
    ]),
    videoCodec: firstMatch(lower, [
      [/\bav1\b/i, "AV1"],
      [/\b(?:h[ ._-]?265|hevc|x265)\b/i, "H.265"],
      [/\b(?:h[ ._-]?264|avc|x264)\b/i, "H.264"],
      [/\bxvid\b/i, "Xvid"],
    ]),
    hdr: firstMatch(lower, [
      [/\b(?:dolby[ ._-]?vision|dovi)\b/i, "杜比视界"],
      [/\bhdr10\+(?!\w)/i, "HDR10+"],
      [/\bhdr10\b/i, "HDR10"],
      [/\bhdr\b/i, "HDR"],
    ]),
    audio: firstMatch(lower, [
      [/\batmos\b/i, "Atmos"],
      [/\bdts[ ._-]?hd(?:[ ._-]?ma)?\b/i, "DTS-HD"],
      [/\btruehd\b/i, "TrueHD"],
      [/\bdts\b/i, "DTS"],
      [/\bflac\b/i, "FLAC"],
      [/\baac\b/i, "AAC"],
    ]),
    languages: languages.length ? [...new Set(languages)] : undefined,
    seasonEpisode: cleanText(seasonEpisode),
    fileType: fileType?.toUpperCase(),
    year: yearValue ? Number(yearValue) : undefined,
  };
}

export function mergeTorrentMetadata(
  current?: TorrentMetadata,
  incoming?: TorrentMetadata
): TorrentMetadata | undefined {
  if (!current && !incoming) return undefined;
  const sizeBytes = maxDefined(current?.sizeBytes, incoming?.sizeBytes);
  const currentSample = Date.parse(current?.metadataCheckedAt || "");
  const incomingSample = Date.parse(incoming?.metadataCheckedAt || "");
  const newestSample = Number.isFinite(currentSample) &&
    Number.isFinite(incomingSample) &&
    currentSample !== incomingSample
    ? incomingSample > currentSample ? incoming : current
    : undefined;
  const merged: TorrentMetadata = {
    adult: current?.adult === true || incoming?.adult === true || undefined,
    infoHash: cleanText(current?.infoHash) || cleanText(incoming?.infoHash),
    size: sizeBytes
      ? formatTorrentSize(sizeBytes)
      : cleanText(current?.size) || cleanText(incoming?.size),
    sizeBytes,
    seeders: newestSample?.seeders ?? maxDefined(current?.seeders, incoming?.seeders),
    leechers: newestSample?.leechers ?? maxDefined(current?.leechers, incoming?.leechers),
    completed: newestSample?.completed ?? maxDefined(current?.completed, incoming?.completed),
    fileCount: maxDefined(current?.fileCount, incoming?.fileCount),
    category: cleanText(current?.category) || cleanText(incoming?.category),
    verified: current?.verified === true || incoming?.verified === true || undefined,
    resolution: cleanText(current?.resolution) || cleanText(incoming?.resolution),
    releaseType: cleanText(current?.releaseType) || cleanText(incoming?.releaseType),
    videoCodec: cleanText(current?.videoCodec) || cleanText(incoming?.videoCodec),
    hdr: cleanText(current?.hdr) || cleanText(incoming?.hdr),
    audio: cleanText(current?.audio) || cleanText(incoming?.audio),
    languages: uniqueStrings(current?.languages, incoming?.languages),
    seasonEpisode: cleanText(current?.seasonEpisode) || cleanText(incoming?.seasonEpisode),
    fileType: cleanText(current?.fileType) || cleanText(incoming?.fileType),
    year: current?.year || incoming?.year,
    sources: uniqueStrings(current?.sources, incoming?.sources),
    originSource: cleanText(current?.originSource) || cleanText(incoming?.originSource),
    trackerCount: maxDefined(current?.trackerCount, incoming?.trackerCount),
    grabs: maxDefined(current?.grabs, incoming?.grabs),
    lastSeenAt: newestDate(current?.lastSeenAt, incoming?.lastSeenAt),
    metadataCheckedAt: newestDate(
      current?.metadataCheckedAt,
      incoming?.metadataCheckedAt
    ),
    riskScore: maxDefined(current?.riskScore, incoming?.riskScore),
    riskFlags: uniqueStrings(current?.riskFlags, incoming?.riskFlags),
  };
  return withTorrentAvailability(merged);
}

export function enrichTorrentMetadata(
  title: string,
  content = "",
  metadata?: TorrentMetadata
): TorrentMetadata {
  const searchableContent = `${content} ${metadata?.category || ""}`.trim();
  return mergeTorrentMetadata(
    metadata,
    inferTorrentMetadata(title, searchableContent)
  ) || {};
}

function keywordScore(title: string, keyword: string): number {
  const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const normalizedTitle = normalize(title || "");
  const normalizedKeyword = normalize(keyword || "");
  if (!normalizedKeyword) return 0;
  if (normalizedTitle === normalizedKeyword) return 80;
  if (normalizedTitle.includes(normalizedKeyword)) return 56;
  const terms = String(keyword || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((term) => term.length > 1);
  if (!terms.length) return 0;
  const matched = terms.filter((term) => normalizedTitle.includes(normalize(term))).length;
  return Math.round((matched / terms.length) * 36);
}

export function scoreTorrentResult(
  item: { title?: string; note?: string; datetime?: string; metadata?: TorrentMetadata },
  keyword = ""
): number {
  const metadata = item.metadata || {};
  const seedScore = metadata.availabilityScore !== undefined
    ? (metadata.availabilityScore / 100) * 32
    : Math.min(32, Math.log2(Math.max(0, metadata.seeders || 0) + 1) * 4);
  const detailScore = [
    metadata.sizeBytes,
    metadata.resolution,
    metadata.releaseType,
    metadata.videoCodec,
    metadata.fileType,
    metadata.seasonEpisode,
    metadata.category,
  ].filter(Boolean).length * 1.5;
  const parsedTime = Date.parse(item.datetime || "");
  const ageDays = Number.isFinite(parsedTime) ? Math.max(0, (Date.now() - parsedTime) / 86_400_000) : Infinity;
  const recencyScore = Number.isFinite(ageDays) ? Math.max(0, 8 - Math.log10(ageDays + 1) * 3) : 0;
  const sourceScore = Math.min(6, Math.max(0, (metadata.sources?.length || 1) - 1) * 3);
  const riskPenalty = metadata.availabilityStatus === "risky" ? 30 : 0;
  return keywordScore(item.title || item.note || "", keyword) + seedScore + detailScore + recencyScore + (metadata.verified ? 5 : 0) + sourceScore - riskPenalty;
}

export function torrentDisplayTags(metadata?: TorrentMetadata, limit = 5): string[] {
  if (!metadata) return [];
  return [
    metadata.resolution,
    metadata.releaseType,
    metadata.videoCodec,
    metadata.hdr,
    metadata.audio,
    metadata.seasonEpisode,
    ...(metadata.languages || []),
    metadata.fileType,
    metadata.year ? String(metadata.year) : undefined,
  ].filter((value): value is string => Boolean(value)).slice(0, limit);
}
