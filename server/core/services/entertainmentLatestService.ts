export type EntertainmentKind = "movie" | "tv";

export interface EntertainmentItem {
  id: string;
  kind: EntertainmentKind;
  title: string;
  cover: string;
  rating?: number;
  ratingCount?: number;
  year: string;
  genres: string[];
  progress: string;
}

export interface EntertainmentCollection {
  id: string;
  kind: EntertainmentKind;
  title: string;
  description: string;
  items: EntertainmentItem[];
}

export interface EntertainmentLatestData {
  movies: EntertainmentItem[];
  tv: EntertainmentItem[];
  collections: EntertainmentCollection[];
  updatedAt: number;
}

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

interface RawEntertainmentItem {
  id?: string | number;
  title?: string;
  year?: string;
  card_subtitle?: string;
  release_date?: string;
  episodes_info?: string;
  cover?: { url?: string };
  pic?: { large?: string; normal?: string };
  rating?: {
    value?: number;
    count?: number;
  };
}

interface RawEntertainmentPayload {
  start?: number;
  count?: number;
  total?: number;
  subject_collection_items?: RawEntertainmentItem[];
}

interface CollectionDefinition {
  id: string;
  source: string;
  kind: EntertainmentKind;
  title: string;
  description: string;
  progress: string;
  minimumRating?: number;
  itemLimit?: number;
}

export const ENTERTAINMENT_REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;
export const MINIMUM_MOVIE_RATING = 6;
export const MINIMUM_HOME_MOVIE_COUNT = 280;

export const HOME_COLLECTIONS: CollectionDefinition[] = [
  {
    id: "movie-weekly",
    source: "movie_weekly_best",
    kind: "movie",
    title: "本周高分电影",
    description: "最近一周口碑最好的电影",
    progress: "本周上榜",
    minimumRating: MINIMUM_MOVIE_RATING,
  },
  {
    id: "movie-hot",
    source: "movie_hot_gaia",
    kind: "movie",
    title: "热门电影",
    description: "近期讨论度与评分都在线",
    progress: "近期热门",
    minimumRating: MINIMUM_MOVIE_RATING,
    itemLimit: 50,
  },
  {
    id: "movie-latest",
    source: "movie_latest",
    kind: "movie",
    title: "近期新片",
    description: "新近上线且评分达到 6.0",
    progress: "近期上线",
    minimumRating: MINIMUM_MOVIE_RATING,
    itemLimit: 50,
  },
  {
    id: "movie-top250",
    source: "movie_top250",
    kind: "movie",
    title: "豆瓣 Top 250",
    description: "长期经得住时间检验的电影",
    progress: "Top 250",
    minimumRating: MINIMUM_MOVIE_RATING,
    itemLimit: 250,
  },
  {
    id: "tv-hot",
    source: "tv_hot",
    kind: "tv",
    title: "近期热播",
    description: "正在更新和近期完结的剧集",
    progress: "近期热播",
  },
  {
    id: "tv-domestic",
    source: "tv_domestic",
    kind: "tv",
    title: "国产剧",
    description: "近期关注度较高的国产剧集",
    progress: "国产剧",
  },
  {
    id: "tv-american",
    source: "tv_american",
    kind: "tv",
    title: "美剧",
    description: "近期热门美剧与新季回归",
    progress: "美剧",
  },
  {
    id: "tv-japanese",
    source: "tv_japanese",
    kind: "tv",
    title: "日剧",
    description: "当季日剧与高口碑作品",
    progress: "日剧",
  },
  {
    id: "tv-korean",
    source: "tv_korean",
    kind: "tv",
    title: "韩剧",
    description: "近期热门韩剧与新上线作品",
    progress: "韩剧",
  },
  {
    id: "tv-animation",
    source: "tv_animation",
    kind: "tv",
    title: "动画",
    description: "新番、国创与长篇动画",
    progress: "动画",
  },
  {
    id: "tv-variety",
    source: "tv_variety_show",
    kind: "tv",
    title: "综艺",
    description: "近期更新的综艺与特别节目",
    progress: "综艺",
  },
];

const REQUEST_HEADERS = {
  accept: "application/json",
  referer: "https://m.douban.com/",
  "user-agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
};

function genresFromSubtitle(value = ""): string[] {
  const genrePart = value
    .split(/\s+\/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)[2];
  if (!genrePart) return [];
  return genrePart.split(/\s+/).filter(Boolean).slice(0, 3);
}

function normalizeItem(
  item: RawEntertainmentItem,
  kind: EntertainmentKind,
  progressFallback: string
): EntertainmentItem | undefined {
  const id = String(item.id || "").trim();
  const title = String(item.title || "").trim();
  const cover = String(
    item.cover?.url || item.pic?.large || item.pic?.normal || ""
  ).trim();
  if (
    !id ||
    !title ||
    !cover ||
    !/^https:\/\/img[1-9]\.doubanio\.com\//i.test(cover)
  ) {
    return undefined;
  }

  const ratingValue = Number(item.rating?.value || 0);
  const ratingCount = Math.floor(Number(item.rating?.count || 0));
  return {
    id,
    kind,
    title,
    cover,
    ...(ratingValue > 0 && ratingValue <= 10
      ? {
          rating: Math.round(ratingValue * 10) / 10,
          ...(ratingCount > 0 ? { ratingCount } : {}),
        }
      : {}),
    year: String(item.year || "").trim(),
    genres: genresFromSubtitle(item.card_subtitle),
    progress:
      kind === "movie"
        ? item.release_date
          ? `${item.release_date} 上映`
          : progressFallback
        : String(item.episodes_info || progressFallback).trim(),
  };
}

export function parseEntertainmentCollection(
  payload: unknown,
  kind: EntertainmentKind,
  limit = 12,
  options: {
    minimumRating?: number;
    progressFallback?: string;
  } = {}
): EntertainmentItem[] {
  const raw = payload as RawEntertainmentPayload | undefined;
  if (!Array.isArray(raw?.subject_collection_items)) return [];

  const items: EntertainmentItem[] = [];
  const seen = new Set<string>();
  for (const value of raw.subject_collection_items) {
    const item = normalizeItem(
      value,
      kind,
      options.progressFallback || (kind === "movie" ? "近期热门" : "近期热播")
    );
    if (!item || seen.has(item.id)) continue;
    if (
      typeof options.minimumRating === "number" &&
      (!item.rating || item.rating < options.minimumRating)
    ) {
      continue;
    }
    seen.add(item.id);
    items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}

async function fetchCollection(
  definition: CollectionDefinition,
  limit: number,
  fetchImpl: FetchLike
): Promise<EntertainmentCollection> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const items: EntertainmentItem[] = [];
      const seen = new Set<string>();
      const requestCount = Math.min(
        100,
        Math.max(limit * (definition.minimumRating ? 3 : 2), 24)
      );
      let start = 0;

      for (let page = 0; page < 4 && items.length < limit; page++) {
        const url = new URL(
          `https://m.douban.com/rexxar/api/v2/subject_collection/${definition.source}/items`
        );
        url.searchParams.set("start", String(start));
        url.searchParams.set("count", String(requestCount));
        url.searchParams.set("items_only", "1");
        url.searchParams.set("for_mobile", "1");

        const response = await fetchImpl(url, {
          headers: REQUEST_HEADERS,
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`upstream returned ${response.status}`);
        }

        const payload = (await response.json()) as RawEntertainmentPayload;
        const pageItems = parseEntertainmentCollection(
          payload,
          definition.kind,
          limit - items.length,
          {
            minimumRating: definition.minimumRating,
            progressFallback: definition.progress,
          }
        );
        for (const item of pageItems) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          items.push(item);
        }

        const rawCount = Array.isArray(payload.subject_collection_items)
          ? payload.subject_collection_items.length
          : 0;
        if (!rawCount) break;
        start += rawCount;
        if (
          (typeof payload.total === "number" && start >= payload.total) ||
          (typeof payload.total !== "number" && rawCount < requestCount)
        ) {
          break;
        }
      }

      if (!items.length) throw new Error("upstream returned no usable items");
      return {
        id: definition.id,
        kind: definition.kind,
        title: definition.title,
        description: definition.description,
        items,
      };
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("upstream error");
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      try {
        results[index] = {
          status: "fulfilled",
          value: await mapper(values[index]),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, concurrency), values.length) },
      () => worker()
    )
  );
  return results;
}

function dedupeCollections(
  collections: EntertainmentCollection[]
): EntertainmentCollection[] {
  const seenByKind: Record<EntertainmentKind, Set<string>> = {
    movie: new Set<string>(),
    tv: new Set<string>(),
  };

  return collections.flatMap((collection) => {
    const seen = seenByKind[collection.kind];
    const items = collection.items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return items.length ? [{ ...collection, items }] : [];
  });
}

function uniqueItems(
  collections: EntertainmentCollection[],
  kind: EntertainmentKind
): EntertainmentItem[] {
  return collections
    .filter((collection) => collection.kind === kind)
    .flatMap((collection) => collection.items);
}

export async function fetchLatestEntertainment(
  limit = 12,
  fetchImpl: FetchLike = fetch
): Promise<EntertainmentLatestData> {
  const safeLimit = Math.max(6, Math.min(18, Math.floor(limit)));
  const settled = await mapWithConcurrency(
    HOME_COLLECTIONS,
    4,
    (definition) =>
      fetchCollection(
        definition,
        Math.max(safeLimit, definition.itemLimit || 0),
        fetchImpl
      )
  );
  const collections = dedupeCollections(
    settled.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    )
  );
  const movieCollections = collections.filter(
    (collection) => collection.kind === "movie"
  );
  const tvCollections = collections.filter(
    (collection) => collection.kind === "tv"
  );

  if (!movieCollections.length || !tvCollections.length) {
    throw new Error("upstream returned incomplete homepage collections");
  }

  const movies = uniqueItems(collections, "movie");
  const tv = uniqueItems(collections, "tv");
  if (movies.length < MINIMUM_HOME_MOVIE_COUNT) {
    throw new Error(
      `upstream returned only ${movies.length} unique homepage movies`
    );
  }

  return {
    movies,
    tv,
    collections,
    updatedAt: Date.now(),
  };
}
