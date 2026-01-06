import type { MergedLinks } from "~/server/core/types/models";

/**
 * 合并按类型分组的结果
 * 去重 URL，保留所有唯一链接
 */
export function mergeMergedByType(
  target: MergedLinks,
  incoming?: MergedLinks
): MergedLinks {
  if (!incoming) return target;

  const out: MergedLinks = { ...target };

  for (const type of Object.keys(incoming)) {
    const existed = out[type] || [];
    const next = incoming[type] || [];
    const seen = new Set<string>(existed.map((x) => x.url));
    const mergedArr = [...existed];

    for (const item of next) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        mergedArr.push(item);
      }
    }

    out[type] = mergedArr;
  }

  return out;
}
