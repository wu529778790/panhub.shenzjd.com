import type {
  MergedLink,
  SearchResultEvaluation,
  TorrentMetadata,
} from "../types/search";

const PLATFORM_CONFIDENCE: Record<string, number> = {
  quark: 10,
  baidu: 9,
  "115": 9,
  aliyun: 8,
  xunlei: 7,
  uc: 7,
  tianyi: 6,
  "123": 6,
  mobile: 5,
  pikpak: 5,
  magnet: 0,
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalize(value: string): string {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function keywordTerms(value: string): string[] {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map(normalize)
    .filter((term) => term.length > 1);
}

function relevanceScore(title: string, keyword: string): number {
  const normalizedTitle = normalize(title);
  const normalizedKeyword = normalize(keyword);
  if (!normalizedTitle || !normalizedKeyword) return 0;
  if (normalizedTitle === normalizedKeyword) return 100;

  const lengthRatio = normalizedTitle.length / Math.max(1, normalizedKeyword.length);
  const noisePenalty = Math.min(12, Math.max(0, lengthRatio - 4) * 2);
  if (normalizedTitle.startsWith(normalizedKeyword)) {
    return clampScore(94 - noisePenalty);
  }
  if (normalizedTitle.includes(normalizedKeyword)) {
    return clampScore(88 - noisePenalty);
  }

  const terms = keywordTerms(keyword);
  if (!terms.length) return 0;
  const matched = terms.filter((term) => normalizedTitle.includes(term)).length;
  const coverage = matched / terms.length;
  return coverage === 1 ? 80 : clampScore(coverage * 68);
}

function latestTimestamp(...values: Array<string | undefined>): number {
  return values.reduce((latest, value) => {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? Math.max(latest, parsed) : latest;
  }, 0);
}

function freshnessScore(item: MergedLink, magnet: boolean, now: number): number {
  const timestamp = magnet
    ? latestTimestamp(
        item.metadata?.metadataCheckedAt,
        item.metadata?.lastSeenAt,
        item.datetime
      )
    : latestTimestamp(item.datetime);
  if (!timestamp) return 35;
  const ageDays = Math.max(0, (now - timestamp) / 86_400_000);
  if (ageDays <= 3) return 100;
  if (ageDays <= 7) return 95;
  if (ageDays <= 30) return 82;
  if (ageDays <= 90) return 68;
  if (ageDays <= 180) return 56;
  if (ageDays <= 365) return 44;
  if (ageDays <= 730) return 28;
  return 16;
}

function cloudAvailabilityScore(item: MergedLink): number {
  switch (item.health_status) {
    case "alive": return 100;
    case "password": return 88;
    case "suspect": return 20;
    case "dead": return 0;
    default: return 52;
  }
}

function magnetAvailabilityScore(metadata: TorrentMetadata): number {
  let score: number;
  if (metadata.availabilityScore !== undefined) {
    score = metadata.availabilityScore;
  } else if (metadata.seeders !== undefined) {
    score = metadata.seeders === 0
      ? 12
      : 25 + Math.min(70, Math.log2(metadata.seeders + 1) * 12);
  } else {
    score = metadata.verified ? 58 : 40;
  }

  if (metadata.availabilityStatus === "stale") score *= 0.55;
  if (metadata.availabilityStatus === "cold") score = Math.min(score, 18);
  if (metadata.availabilityStatus === "risky") score *= 0.35;
  if (metadata.verified) score += 5;
  return clampScore(score);
}

function qualityScore(item: MergedLink, magnet: boolean): number {
  const metadata = item.metadata || {};
  const technicalDetails = [
    metadata.resolution,
    metadata.releaseType,
    metadata.videoCodec,
    metadata.hdr,
    metadata.audio,
    metadata.languages?.length,
    metadata.seasonEpisode,
    metadata.fileType,
    metadata.year,
  ].filter(Boolean).length;

  if (magnet) {
    let score = 25 + Math.min(56, technicalDetails * 8);
    if (metadata.sizeBytes) score += 10;
    if (metadata.fileCount) score += 6;
    if (metadata.category) score += 5;
    if (metadata.verified) score += 12;
    if (metadata.releaseType === "CAM") score -= 24;
    return clampScore(score);
  }

  let score = 42 + Math.min(30, technicalDetails * 5);
  if (item.category || metadata.category) score += 7;
  if (item.images?.length) score += 5;
  if (metadata.verified) score += 8;
  if (normalize(item.note).length >= 4) score += 5;
  return clampScore(score);
}

function supportCount(item: MergedLink): number {
  return Math.max(
    1,
    Number(item.support_count || 0),
    item.sources?.length || 0,
    item.metadata?.sources?.length || 0
  );
}

function sourceConfidenceScore(item: MergedLink, platform: string): number {
  const support = supportCount(item);
  const platformConfidence = PLATFORM_CONFIDENCE[platform.toLowerCase()] || 0;
  const verification = item.metadata?.verified ? 7 : 0;
  return clampScore(38 + Math.log2(support) * 20 + platformConfidence + verification);
}

function riskScore(item: MergedLink): number {
  const metadata = item.metadata || {};
  const rawRisk = Number(metadata.riskScore || 0);
  let score = rawRisk <= 1 ? rawRisk * 100 : rawRisk;
  score += Math.min(45, (metadata.riskFlags?.length || 0) * 18);
  if (metadata.availabilityStatus === "risky") score = Math.max(score, 75);
  if (item.health_status === "suspect") score = Math.max(score, 58);
  return clampScore(score);
}

function evaluationReasons(
  item: MergedLink,
  magnet: boolean,
  evaluation: Omit<SearchResultEvaluation, "reasons">
): string[] {
  const reasons: string[] = [];
  const support = supportCount(item);
  const metadata = item.metadata || {};
  const specification = [metadata.resolution, metadata.releaseType]
    .filter(Boolean)
    .join(" ");

  if (evaluation.relevance === 100) reasons.push("标题完整匹配");
  else if (evaluation.relevance >= 88) reasons.push("标题直接命中关键词");
  else if (evaluation.relevance >= 75) reasons.push("关键词覆盖完整");

  if (magnet) {
    if (Number(metadata.seeders || 0) > 0) {
      reasons.push(`${metadata.seeders} 个做种`);
    } else if (metadata.availabilityStatus === "active") {
      reasons.push("近期有活跃数据");
    }
    if (specification) reasons.push(`${specification} 规格清晰`);
    if (metadata.verified) reasons.push("索引源已验证");
  } else if (item.health_status === "alive") {
    reasons.push("近期验证可用");
  } else if (item.health_status === "password") {
    reasons.push("链接可访问，需提取码");
  }

  if (support >= 2) reasons.push(`${support} 个来源交叉收录`);

  if (!magnet && specification) reasons.push(`${specification} 规格清晰`);
  else if (evaluation.quality >= 72) reasons.push("资源信息较完整");

  if (evaluation.freshness >= 82) reasons.push("近期收录");
  if (evaluation.risk >= 60) reasons.unshift("来源提示风险");
  else if (item.health_status === "suspect") reasons.unshift("链接状态待复核");

  return [...new Set(reasons)].slice(0, 3);
}

/**
 * 使用可解释的统一量表评估云盘和磁力结果。
 * risk 数值越高风险越高，其余维度和 overall 均为越高越好。
 */
export function evaluateSearchResult(
  item: MergedLink,
  keyword: string,
  platform: string,
  now = Date.now()
): SearchResultEvaluation {
  const magnet = platform.toLowerCase() === "magnet" || /^magnet:\?/i.test(item.url);
  const relevance = relevanceScore(item.note || "", keyword);
  const availability = magnet
    ? magnetAvailabilityScore(item.metadata || {})
    : cloudAvailabilityScore(item);
  const quality = qualityScore(item, magnet);
  const sourceConfidence = sourceConfidenceScore(item, platform);
  const freshness = freshnessScore(item, magnet, now);
  const risk = riskScore(item);
  const weights = magnet
    ? { relevance: 0.36, availability: 0.27, quality: 0.17, source: 0.1, freshness: 0.1, risk: 0.3 }
    : { relevance: 0.44, availability: 0.23, quality: 0.1, source: 0.14, freshness: 0.09, risk: 0.22 };
  const overall = clampScore(
    relevance * weights.relevance
    + availability * weights.availability
    + quality * weights.quality
    + sourceConfidence * weights.source
    + freshness * weights.freshness
    - risk * weights.risk
  );
  const dimensions = {
    overall,
    relevance,
    availability,
    quality,
    sourceConfidence,
    freshness,
    risk,
  };
  return {
    ...dimensions,
    reasons: evaluationReasons(item, magnet, dimensions),
  };
}
