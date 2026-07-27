import type {
  SearchResultEvaluation,
  TorrentMetadata,
} from "../../../types/search";

export type {
  SearchResultEvaluation,
  TorrentMetadata,
} from "../../../types/search";

export interface Link {
  type: string;
  url: string;
  password: string;
}

export type SearchMatchMode = "fuzzy" | "exact";

export interface SearchResult {
  message_id: string;
  unique_id: string;
  channel: string;
  datetime: string; // ISO string
  title: string;
  content: string;
  links: Link[];
  tags?: string[];
  images?: string[];
  source?: string;
  metadata?: TorrentMetadata;
}

export interface MergedLink {
  url: string;
  password: string;
  note: string;
  datetime: string; // ISO string
  source?: string; // e.g. "tg:channel" or "plugin:name"
  images?: string[];
  metadata?: TorrentMetadata;
  category?: string;
  sources?: string[];
  support_count?: number;
  health_status?: "unknown" | "alive" | "dead" | "password" | "suspect";
  relevance_score?: number;
  evaluation?: SearchResultEvaluation;
}

export type MergedLinks = Record<string, MergedLink[]>;

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

export interface SearchRequest {
  kw: string;
  match?: SearchMatchMode;
  channels?: string[];
  conc?: number;
  refresh?: boolean;
  res?: "all" | "results" | "merge" | "merged_by_type";
  src?: "all" | "tg" | "plugin";
  plugins?: string[];
  ext?: Record<string, any>;
  cloud_types?: string[];
}
