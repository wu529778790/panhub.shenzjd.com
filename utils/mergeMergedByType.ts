import type { MergedLinks } from "~/types/search";
import { mergeTorrentMetadata, normalizeMagnetKey } from "./torrentMetadata";

/** 按类型合并搜索结果；磁力按 BTIH 去重并合并不同来源的元数据。 */
export function mergeMergedByType(
  target: MergedLinks,
  incoming?: MergedLinks
): MergedLinks {
  if (!incoming) return target;
  const out: MergedLinks = { ...target };
  for (const type of Object.keys(incoming)) {
    const existed = out[type] || [];
    const next = incoming[type] || [];
    const mergedArr = [...existed];
    const indexByKey = new Map(
      mergedArr.map((item, index) => [
        type === "magnet" ? normalizeMagnetKey(item.url) : item.url,
        index,
      ])
    );
    for (const item of next) {
      const key = type === "magnet" ? normalizeMagnetKey(item.url) : item.url;
      const existingIndex = indexByKey.get(key);
      if (existingIndex === undefined) {
        indexByKey.set(key, mergedArr.length);
        mergedArr.push(item);
        continue;
      }
      const current = mergedArr[existingIndex];
      if (!current) continue;
      const sources = Array.from(
        new Set([
          ...(current.sources || (current.source ? [current.source] : [])),
          ...(item.sources || (item.source ? [item.source] : [])),
        ])
      );
      if (type !== "magnet") {
        mergedArr[existingIndex] = {
          ...current,
          category: current.category || item.category,
          sources,
          support_count: sources.length || Math.max(
            current.support_count || 1,
            item.support_count || 1
          ),
          relevance_score: Math.max(
            current.relevance_score || 0,
            item.relevance_score || 0
          ),
        };
        continue;
      }
      const currentTime = Date.parse(current.datetime || "");
      const incomingTime = Date.parse(item.datetime || "");
      mergedArr[existingIndex] = {
        ...current,
        url: item.url.length > current.url.length ? item.url : current.url,
        note: current.note.length >= item.note.length ? current.note : item.note,
        datetime:
          Number.isFinite(incomingTime) && (!Number.isFinite(currentTime) || incomingTime > currentTime)
            ? item.datetime
            : current.datetime,
        source: current.source || item.source,
        images: current.images?.length ? current.images : item.images,
        metadata: mergeTorrentMetadata(current.metadata, item.metadata),
        category: current.category || item.category,
        sources,
        support_count: sources.length || 1,
        relevance_score: Math.max(
          current.relevance_score || 0,
          item.relevance_score || 0
        ),
      };
    }
    out[type] = mergedArr;
  }
  return out;
}
