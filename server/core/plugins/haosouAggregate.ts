import { BaseAsyncPlugin } from "./manager";
import type {
  GenericResponse,
  SearchResponse,
  SearchResult,
} from "../types/models";

interface ServiceFetcher {
  fetch(request: Request): Promise<Response>;
}

export class HaosouAggregatePlugin extends BaseAsyncPlugin {
  constructor() {
    super("好搜聚合", 4);
  }

  timeoutMs(): number {
    return 9000;
  }

  override async search(
    keyword: string,
    ext: Record<string, any> = {}
  ): Promise<SearchResult[]> {
    const fetcher = ext.__pansou_fetcher as ServiceFetcher | undefined;
    if (!fetcher || typeof fetcher.fetch !== "function") return [];

    const url = new URL("https://pansou.internal/api/search");
    url.searchParams.set("kw", keyword);
    url.searchParams.set("src", "plugin");
    url.searchParams.set("res", "results");

    const response = await fetcher.fetch(
      new Request(url, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: ext.signal as AbortSignal | undefined,
      })
    );

    if (!response.ok) {
      throw new Error(`Aggregate search failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as GenericResponse<SearchResponse>;
    if (payload.code !== 0 || !Array.isArray(payload.data?.results)) return [];
    return payload.data.results;
  }
}
