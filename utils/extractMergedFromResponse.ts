import type {
  MergedLink,
  MergedLinks,
  SearchResponse,
  SearchResult,
} from "~/types/search";

/** 从 API 响应中提取 MergedLinks，兼容 merged_by_type、results 及扁平数组等多种格式 */
export function extractMergedFromResponse(
  data: SearchResponse | Record<string, any> | undefined
): MergedLinks {
  if (!data) return {};
  // 1. 标准 merged_by_type
  if (data.merged_by_type && typeof data.merged_by_type === "object") {
    const m = data.merged_by_type as MergedLinks;
    if (Object.keys(m).length > 0) return m;
  }
  // 2. results: SearchResult[] 或 MergedLink[]，需展开并分组
  const results = data.results;
  if (Array.isArray(results) && results.length > 0) {
    const out: MergedLinks = {};
    for (const r of results) {
      const rAny = r as any;
      // SearchResult 格式：有 links 数组
      const links = rAny.links;
      if (Array.isArray(links) && links.length > 0) {
        const note = rAny.title || rAny.content || "";
        const dt = rAny.datetime || "";
        for (const link of links) {
          const t = link.type || "others";
          if (!out[t]) out[t] = [];
          out[t].push({
            url: link.url,
            password: link.password || "",
            note,
            datetime: dt,
            source: rAny.source || (rAny.channel ? "频道索引" : undefined),
            images: rAny.images,
            metadata: rAny.metadata,
          });
        }
      } else if (rAny.url) {
        // 扁平 MergedLink 格式
        const t = rAny.type || "others";
        if (!out[t]) out[t] = [];
        out[t].push({
          url: rAny.url,
          password: rAny.password || "",
          note: rAny.note || "",
          datetime: rAny.datetime || "",
          source: rAny.source,
          images: rAny.images,
          metadata: rAny.metadata,
        });
      }
    }
    return out;
  }
  // 3. 扁平数组（data 本身为数组，或 data.items / data.list 等）
  const arr = Array.isArray(data) ? data : (data?.items ?? data?.list ?? data?.data);
  if (Array.isArray(arr) && arr.length > 0) {
    const out: MergedLinks = {};
    for (const item of arr as MergedLink[]) {
      if (item && item.url) {
        const t = (item as any).type || "others";
        if (!out[t]) out[t] = [];
        out[t].push({
          url: item.url,
          password: item.password || "",
          note: item.note || "",
          datetime: item.datetime || "",
          source: item.source,
          images: item.images,
          metadata: item.metadata,
        });
      }
    }
    return out;
  }
  return {};
}
