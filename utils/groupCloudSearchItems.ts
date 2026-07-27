import type { SearchViewItem } from "~/types/search";
import type { LinkHealthStatus } from "~/utils/linkHealth";

const HEALTH_RANK: Record<LinkHealthStatus, number> = {
  alive: 5,
  password: 4,
  unknown: 3,
  suspect: 2,
  dead: 1,
};

export function normalizeCloudResultTitle(value: string): string {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function timeValue(value?: string): number {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareItems(
  left: SearchViewItem,
  right: SearchViewItem,
  resolveHealth?: (url: string) => LinkHealthStatus | undefined
): number {
  const leftHealth = resolveHealth?.(left.url) || left.health_status || "unknown";
  const rightHealth = resolveHealth?.(right.url) || right.health_status || "unknown";
  const healthDelta = HEALTH_RANK[rightHealth] - HEALTH_RANK[leftHealth];
  if (healthDelta) return healthDelta;

  const relevanceDelta =
    Number(right.relevance_score || 0) - Number(left.relevance_score || 0);
  if (relevanceDelta) return relevanceDelta;

  const supportDelta =
    Number(right.support_count || 1) - Number(left.support_count || 1);
  if (supportDelta) return supportDelta;

  return timeValue(right.datetime) - timeValue(left.datetime);
}

export function groupCloudSearchItems(
  items: SearchViewItem[],
  resolveHealth?: (url: string) => LinkHealthStatus | undefined
): SearchViewItem[] {
  const groups = new Map<string, SearchViewItem[]>();

  for (const item of items) {
    const normalizedTitle = normalizeCloudResultTitle(item.title);
    const key = normalizedTitle.length >= 2
      ? `${item.type}\u0000${normalizedTitle}`
      : `${item.type}\u0000url:${item.url}`;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  const grouped: SearchViewItem[] = [];
  for (const values of groups.values()) {
    if (values.length === 1) {
      grouped.push(values[0]!);
      continue;
    }

    const ranked = [...values].sort((left, right) =>
      compareItems(left, right, resolveHealth)
    );
    const primary = ranked[0]!;
    grouped.push({
      ...primary,
      sources: Array.from(
        new Set(
          ranked.flatMap((item) =>
            item.sources || (item.source ? [item.source] : [])
          )
        )
      ),
      alternate_links: ranked.slice(1).map((item) => ({
        url: item.url,
        password: item.password,
        note: item.note,
        datetime: item.datetime,
        source: item.source,
        images: item.images,
        metadata: item.metadata,
        category: item.category,
        sources: item.sources,
        support_count: item.support_count,
        health_status: item.health_status,
        relevance_score: item.relevance_score,
        evaluation: item.evaluation,
      })),
    });
  }

  return grouped;
}
