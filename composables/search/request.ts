import type { GenericResponse, SearchResponse } from "~/server/core/types/models";

/**
 * 执行单个搜索请求
 */
export async function executeSearchRequest(
  url: string,
  params: Record<string, any>,
  signal: AbortController
): Promise<SearchResponse | null> {
  try {
    const response = await $fetch<GenericResponse<SearchResponse>>(url, {
      method: "GET",
      query: params,
      signal: signal.signal,
    } as any);
    return response.data || null;
  } catch (error: any) {
    // 请求失败或被中止，返回 null
    return null;
  }
}

/**
 * 批量执行搜索请求
 */
export async function executeBatchSearch(
  url: string,
  batchParams: Array<Record<string, any>>,
  activeControllers: AbortController[]
): Promise<SearchResponse[]> {
  const promises: Array<Promise<SearchResponse | null>> = [];

  for (const params of batchParams) {
    const ac = new AbortController();
    activeControllers.push(ac);
    promises.push(executeSearchRequest(url, params, ac));
  }

  const results = await Promise.all(promises);
  return results.filter((r): r is SearchResponse => r !== null);
}
