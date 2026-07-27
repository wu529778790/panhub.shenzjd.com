import type { MergedLink, SearchResponse } from "../types/models";
import { evaluateSearchResult } from "../../../utils/searchEvaluation";

export function scoreGeneralSearchResult(
  item: MergedLink,
  keyword: string,
  platform: string,
  now = Date.now()
): number {
  return evaluateSearchResult(item, keyword, platform, now).overall;
}

export function sortMergedLinksByRelevance(
  items: MergedLink[],
  keyword: string,
  platform: string
): MergedLink[] {
  for (const item of items) {
    item.evaluation = evaluateSearchResult(item, keyword, platform);
    item.relevance_score = item.evaluation.overall;
  }
  return items.sort((left, right) => {
    const scoreDiff =
      Number(right.relevance_score || 0) - Number(left.relevance_score || 0);
    if (scoreDiff) return scoreDiff;
    return (right.datetime || "").localeCompare(left.datetime || "");
  });
}

/** 在链接健康状态更新后重新计算评估，确保 API 排序与返回分数一致。 */
export function evaluateMergedSearchResponse(
  response: SearchResponse,
  keyword: string
): SearchResponse {
  if (!response.merged_by_type) return response;
  return {
    ...response,
    merged_by_type: Object.fromEntries(
      Object.entries(response.merged_by_type).map(([platform, items]) => [
        platform,
        sortMergedLinksByRelevance([...items], keyword, platform),
      ])
    ),
  };
}
