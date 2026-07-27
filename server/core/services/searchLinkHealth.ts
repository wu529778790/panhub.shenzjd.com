import type { D1DatabaseLike } from "../../utils/cloudflareBindings";
import { normalizeLinkHealthUrl } from "../../../utils/linkHealth";
import type { SearchResponse } from "../types/models";
import {
  MAX_LINK_HEALTH_BATCH,
  queryLinkHealth,
} from "./linkHealthService";

function collectSearchUrls(response: SearchResponse): string[] {
  const urls = new Set<string>();
  for (const items of Object.values(response.merged_by_type || {})) {
    for (const item of items) {
      if (item?.url) urls.add(item.url);
    }
  }
  for (const result of response.results || []) {
    for (const link of result.links || []) {
      if (link?.url) urls.add(link.url);
    }
  }
  return Array.from(urls);
}

export function removeDeadSearchLinks(
  response: SearchResponse,
  deadNormalizedUrls: Set<string>
): { response: SearchResponse; filteredDeadCount: number } {
  if (deadNormalizedUrls.size === 0) {
    return { response, filteredDeadCount: 0 };
  }

  const removedUrls = new Set<string>();
  const isDead = (url: string): boolean => {
    const normalizedUrl = normalizeLinkHealthUrl(url);
    if (!normalizedUrl || !deadNormalizedUrls.has(normalizedUrl)) return false;
    removedUrls.add(normalizedUrl);
    return true;
  };

  const filtered: SearchResponse = { ...response };
  if (response.merged_by_type) {
    filtered.merged_by_type = Object.fromEntries(
      Object.entries(response.merged_by_type)
        .map(([type, items]) => [
          type,
          items.filter((item) => !isDead(item.url)),
        ] as const)
        .filter(([, items]) => items.length > 0)
    );
  }

  if (response.results) {
    filtered.results = response.results
      .map((result) => ({
        ...result,
        links: (result.links || []).filter((link) => !isDead(link.url)),
      }))
      .filter((result) => result.links.length > 0);
  }

  if (filtered.results) {
    filtered.total = filtered.results.length;
  } else if (filtered.merged_by_type) {
    filtered.total = Object.values(filtered.merged_by_type).reduce(
      (sum, items) => sum + items.length,
      0
    );
  }
  filtered.filtered_dead_count = removedUrls.size;

  return {
    response: filtered,
    filteredDeadCount: removedUrls.size,
  };
}

export function deprioritizeSuspectSearchLinks(
  response: SearchResponse,
  suspectNormalizedUrls: Set<string>
): SearchResponse {
  if (suspectNormalizedUrls.size === 0) return response;
  const isSuspect = (url: string): boolean => {
    const normalizedUrl = normalizeLinkHealthUrl(url);
    return Boolean(normalizedUrl && suspectNormalizedUrls.has(normalizedUrl));
  };
  const sorted: SearchResponse = { ...response };
  if (response.merged_by_type) {
    sorted.merged_by_type = Object.fromEntries(
      Object.entries(response.merged_by_type).map(([type, items]) => [
        type,
        [...items].sort(
          (left, right) => Number(isSuspect(left.url)) - Number(isSuspect(right.url))
        ),
      ])
    );
  }
  if (response.results) {
    sorted.results = [...response.results].sort((left, right) => {
      const leftSuspect =
        left.links.length > 0 && left.links.every((link) => isSuspect(link.url));
      const rightSuspect =
        right.links.length > 0 && right.links.every((link) => isSuspect(link.url));
      return Number(leftSuspect) - Number(rightSuspect);
    });
  }
  return sorted;
}

export function annotateSearchLinkHealth(
  response: SearchResponse,
  statusByNormalizedUrl: Map<string, "unknown" | "alive" | "dead" | "password" | "suspect">
): SearchResponse {
  if (!response.merged_by_type || statusByNormalizedUrl.size === 0) return response;
  return {
    ...response,
    merged_by_type: Object.fromEntries(
      Object.entries(response.merged_by_type).map(([type, items]) => [
        type,
        items.map((item) => {
          const normalizedUrl = normalizeLinkHealthUrl(item.url);
          const healthStatus = normalizedUrl
            ? statusByNormalizedUrl.get(normalizedUrl)
            : undefined;
          return healthStatus ? { ...item, health_status: healthStatus } : item;
        }),
      ])
    ),
  };
}

export async function filterKnownDeadSearchLinks(
  database: D1DatabaseLike | undefined,
  response: SearchResponse
): Promise<{ response: SearchResponse; filteredDeadCount: number }> {
  if (!database) return { response, filteredDeadCount: 0 };

  const urls = collectSearchUrls(response);
  if (urls.length === 0) return { response, filteredDeadCount: 0 };

  const batches: string[][] = [];
  for (let index = 0; index < urls.length; index += MAX_LINK_HEALTH_BATCH) {
    batches.push(urls.slice(index, index + MAX_LINK_HEALTH_BATCH));
  }
  const healthItems = (
    await Promise.all(batches.map((batch) => queryLinkHealth(database, batch)))
  ).flat();
  const deadUrls = new Set(
    healthItems
      .filter((item) => item.status === "dead")
      .map((item) => item.normalizedUrl)
  );
  const suspectUrls = new Set(
    healthItems
      .filter((item) => item.status === "suspect")
      .map((item) => item.normalizedUrl)
  );

  const statusByUrl = new Map(
    healthItems.map((item) => [item.normalizedUrl, item.status] as const)
  );

  const filtered = removeDeadSearchLinks(response, deadUrls);
  filtered.response = deprioritizeSuspectSearchLinks(
    annotateSearchLinkHealth(filtered.response, statusByUrl),
    suspectUrls
  );
  return filtered;
}
