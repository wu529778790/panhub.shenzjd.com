/**
 * Client/Server 共享的搜索类型
 * Client: composables/useSearch.ts, utils/*.ts
 * Server: server/core/types/models.ts 保留 server 专用类型
 */

export interface TorrentMetadata {
  adult?: boolean;
  infoHash?: string;
  size?: string;
  sizeBytes?: number;
  seeders?: number;
  leechers?: number;
  completed?: number;
  fileCount?: number;
  category?: string;
  verified?: boolean;
  resolution?: string;
  releaseType?: string;
  videoCodec?: string;
  hdr?: string;
  audio?: string;
  languages?: string[];
  seasonEpisode?: string;
  fileType?: string;
  year?: number;
  sources?: string[];
  originSource?: string;
  trackerCount?: number;
  grabs?: number;
  lastSeenAt?: string;
  metadataCheckedAt?: string;
  availabilityStatus?: "active" | "cold" | "stale" | "unknown" | "risky";
  availabilityScore?: number;
  riskScore?: number;
  riskFlags?: string[];
}

export interface SearchResultEvaluation {
  overall: number;
  relevance: number;
  availability: number;
  quality: number;
  sourceConfidence: number;
  freshness: number;
  /** 风险越高数值越高，其余维度均为越高越好。 */
  risk: number;
  reasons: string[];
}

export interface MergedLink {
  url: string;
  password: string;
  note: string;
  datetime: string;
  source?: string;
  images?: string[];
  metadata?: TorrentMetadata;
  category?: string;
  sources?: string[];
  support_count?: number;
  health_status?: "unknown" | "alive" | "dead" | "password" | "suspect";
  relevance_score?: number;
  evaluation?: SearchResultEvaluation;
  alternate_links?: MergedLink[];
}

export type SearchMatchMode = "fuzzy" | "exact";

export interface SearchViewItem extends MergedLink {
  id: string;
  type: string;
  title: string;
}

export interface AiResourceAnalysis {
  id: string;
  normalizedTitle: string;
  category: string;
  tags: string[];
  qualityScore: number;
  confidence: number;
  summary: string;
  riskFlags: string[];
}

export type MergedLinks = Record<string, MergedLink[]>;

export interface SearchResult {
  message_id: string;
  unique_id: string;
  channel: string;
  datetime: string;
  title: string;
  content: string;
  links: Link[];
  tags?: string[];
  images?: string[];
  source?: string;
  metadata?: TorrentMetadata;
}

export interface Link {
  type: string;
  url: string;
  password: string;
}

export interface SearchResponse {
  total: number;
  results?: SearchResult[];
  merged_by_type?: MergedLinks;
  filtered_dead_count?: number;
}

export interface GenericResponse<T> {
  code: number;
  message: string;
  data?: T;
}
