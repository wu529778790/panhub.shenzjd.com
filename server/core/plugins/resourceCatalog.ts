import { BaseAsyncPlugin } from "./manager";
import type { SearchResult } from "../types/models";
import type { D1DatabaseLike } from "../../utils/cloudflareBindings";

interface CatalogRow {
  normalized_url: string;
  url: string;
  type: string;
  password: string;
  title: string;
  category: string;
  last_seen_at: number;
  source_label: string;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function supportsTrigramSearch(value: string): boolean {
  return Array.from(value).length >= 3;
}

function ftsPhrase(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

const CATALOG_SELECT = `SELECT c.normalized_url, c.url, c.type, c.password, c.title,
                               c.category, c.last_seen_at,
                               COALESCE((
                                 SELECT s.source_label
                                 FROM resource_catalog_sources s
                                 WHERE s.normalized_url = c.normalized_url
                                 ORDER BY s.updated_at DESC
                                 LIMIT 1
                               ), '精选资料库') AS source_label`;

const CATALOG_VISIBILITY = `c.status <> 'dead'
  AND NOT EXISTS (
    SELECT 1 FROM link_health h
    WHERE h.normalized_url = c.normalized_url AND h.status = 'dead'
  )`;

export class ResourceCatalogPlugin extends BaseAsyncPlugin {
  constructor() {
    super("精选资料库", 1);
  }

  timeoutMs(): number {
    return 1200;
  }

  useKeywordVariants(): boolean {
    return false;
  }

  override async search(
    keyword: string,
    ext: Record<string, any> = {}
  ): Promise<SearchResult[]> {
    const database = ext.__resource_database as D1DatabaseLike | undefined;
    if (!database || typeof database.prepare !== "function") return [];

    const term = keyword.trim().slice(0, 120);
    if (!term) return [];
    const contains = `%${escapeLike(term)}%`;
    const startsWith = `${escapeLike(term)}%`;

    try {
      let response: { results?: CatalogRow[] };
      if (supportsTrigramSearch(term)) {
        try {
          response = await database
            .prepare(
              `${CATALOG_SELECT}
               FROM resource_catalog_fts
               JOIN resource_catalog c ON c.rowid = resource_catalog_fts.rowid
               WHERE resource_catalog_fts MATCH ?
                 AND ${CATALOG_VISIBILITY}
               ORDER BY
                 CASE
                   WHEN c.title = ? THEN 0
                   WHEN c.title LIKE ? ESCAPE '\\' THEN 1
                   ELSE 2
                 END,
                 bm25(resource_catalog_fts),
                 c.last_seen_at DESC
               LIMIT 120`
            )
            .bind(ftsPhrase(term), term, startsWith)
            .all<CatalogRow>();
        } catch (error) {
          if (!/no such (?:table|module).*fts|resource_catalog_fts/i.test(String(error))) {
            throw error;
          }
          response = await this.searchWithLike(
            database,
            contains,
            term,
            startsWith
          );
        }
      } else {
        response = await this.searchWithLike(
          database,
          contains,
          term,
          startsWith
        );
      }

      return (response.results || []).map((row) => ({
        message_id: "",
        unique_id: `catalog-${stableId(row.normalized_url)}`,
        channel: "",
        datetime:
          Number(row.last_seen_at) > 0
            ? new Date(Number(row.last_seen_at)).toISOString()
            : "",
        title: row.title,
        content: row.category,
        tags: row.category ? [row.category] : undefined,
        source: row.source_label || "精选资料库",
        links: [
          {
            type: row.type,
            url: row.url,
            password: row.password || "",
          },
        ],
      }));
    } catch (error) {
      if (/no such table/i.test(String(error))) return [];
      throw error;
    }
  }

  private searchWithLike(
    database: D1DatabaseLike,
    contains: string,
    term: string,
    startsWith: string
  ): Promise<{ results?: CatalogRow[] }> {
    return database
      .prepare(
        `${CATALOG_SELECT}
         FROM resource_catalog c
         WHERE ${CATALOG_VISIBILITY}
           AND (c.title LIKE ? ESCAPE '\\' OR c.category LIKE ? ESCAPE '\\')
         ORDER BY
           CASE
             WHEN c.title = ? THEN 0
             WHEN c.title LIKE ? ESCAPE '\\' THEN 1
             ELSE 2
           END,
           c.last_seen_at DESC
         LIMIT 120`
      )
      .bind(contains, contains, term, startsWith)
      .all<CatalogRow>();
  }
}
