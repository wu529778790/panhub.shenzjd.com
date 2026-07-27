export type MediaDetailKind = "movie" | "tv";

export interface MediaDetailPerson {
  name: string;
}

export interface MediaDetailHonor {
  title: string;
  rank?: number;
}

export interface MediaDetail {
  id: string;
  kind: MediaDetailKind;
  title: string;
  originalTitle: string;
  year: string;
  cover: string;
  rating?: number;
  ratingCount?: number;
  intro: string;
  genres: string[];
  countries: string[];
  languages: string[];
  durations: string[];
  directors: MediaDetailPerson[];
  actors: MediaDetailPerson[];
  aliases: string[];
  releaseDates: string[];
  episodeCount?: number;
  lastEpisodeNumber?: number;
  seasonsCount?: number;
  episodeInfo: string;
  honors: MediaDetailHonor[];
  doubanUrl: string;
  updatedAt: number;
}

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

interface RawDoubanPerson {
  name?: string;
}

interface RawDoubanHonor {
  title?: string;
  rank?: number;
}

interface RawDoubanMediaDetail {
  id?: string | number;
  title?: string;
  original_title?: string;
  year?: string;
  is_tv?: boolean;
  subtype?: string;
  type?: string;
  pic?: {
    large?: string;
    normal?: string;
  };
  cover_url?: string;
  rating?: {
    value?: number;
    count?: number;
  };
  intro?: string;
  genres?: string[];
  countries?: string[];
  languages?: string[];
  durations?: string[];
  directors?: RawDoubanPerson[];
  actors?: RawDoubanPerson[];
  aka?: string[];
  pubdate?: string[];
  episodes_count?: number;
  last_episode_number?: number;
  seasons_count?: number;
  episodes_info?: string;
  honor_infos?: RawDoubanHonor[];
}

const REQUEST_HEADERS = {
  accept: "application/json",
  referer: "https://m.douban.com/",
  "user-agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
};

export const MEDIA_DETAIL_REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;

export function isValidDoubanSubjectId(value: string): boolean {
  return /^\d{5,12}$/.test(String(value || "").trim());
}

function cleanText(value: unknown, maxLength = 5000): string {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function cleanList(value: unknown, limit = 24): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => cleanText(item, 120))
        .filter(Boolean)
    )
  ).slice(0, limit);
}

function cleanPeople(value: unknown, limit: number): MediaDetailPerson[] {
  if (!Array.isArray(value)) return [];
  const names = new Set<string>();
  for (const item of value) {
    const name = cleanText((item as RawDoubanPerson | undefined)?.name, 80);
    if (name) names.add(name);
    if (names.size >= limit) break;
  }
  return Array.from(names, (name) => ({ name }));
}

function cleanPositiveInteger(value: unknown): number | undefined {
  const parsed = Math.floor(Number(value || 0));
  return parsed > 0 ? parsed : undefined;
}

function cleanRating(value: unknown): number | undefined {
  const parsed = Number(value || 0);
  return parsed > 0 && parsed <= 10
    ? Math.round(parsed * 10) / 10
    : undefined;
}

function isAllowedCover(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /(^|\.)doubanio\.com$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
}

export function parseDoubanMediaDetail(
  payload: unknown,
  expectedId: string,
  now = Date.now()
): MediaDetail | undefined {
  const raw = payload as RawDoubanMediaDetail | undefined;
  const id = cleanText(raw?.id, 20);
  const title = cleanText(raw?.title, 160);
  const year = cleanText(raw?.year, 8);
  const coverCandidates = [
    cleanText(raw?.pic?.large, 1000),
    cleanText(raw?.pic?.normal, 1000),
    cleanText(raw?.cover_url, 1000),
  ];
  const cover = coverCandidates.find(isAllowedCover) || "";

  if (
    !isValidDoubanSubjectId(expectedId) ||
    id !== expectedId ||
    !title ||
    !cover
  ) {
    return undefined;
  }

  const honors = Array.isArray(raw?.honor_infos)
    ? raw.honor_infos
        .map((item) => {
          const honorTitle = cleanText(item?.title, 120);
          if (!honorTitle) return undefined;
          const rank = cleanPositiveInteger(item?.rank);
          return {
            title: honorTitle,
            ...(rank ? { rank } : {}),
          };
        })
        .filter((item): item is MediaDetailHonor => Boolean(item))
        .slice(0, 8)
    : [];
  const rating = cleanRating(raw?.rating?.value);
  const ratingCount = cleanPositiveInteger(raw?.rating?.count);
  const episodeCount = cleanPositiveInteger(raw?.episodes_count);
  const lastEpisodeNumber = cleanPositiveInteger(raw?.last_episode_number);
  const seasonsCount = cleanPositiveInteger(raw?.seasons_count);

  return {
    id,
    kind:
      raw?.is_tv === true ||
      raw?.subtype === "tv" ||
      raw?.type === "tv"
        ? "tv"
        : "movie",
    title,
    originalTitle: cleanText(raw?.original_title, 220),
    year: /^\d{4}$/.test(year) ? year : "",
    cover,
    ...(rating ? { rating } : {}),
    ...(ratingCount ? { ratingCount } : {}),
    intro: cleanText(raw?.intro, 6000),
    genres: cleanList(raw?.genres, 12),
    countries: cleanList(raw?.countries, 12),
    languages: cleanList(raw?.languages, 12),
    durations: cleanList(raw?.durations, 8),
    directors: cleanPeople(raw?.directors, 12),
    actors: cleanPeople(raw?.actors, 24),
    aliases: cleanList(raw?.aka, 12),
    releaseDates: cleanList(raw?.pubdate, 16),
    ...(episodeCount ? { episodeCount } : {}),
    ...(lastEpisodeNumber ? { lastEpisodeNumber } : {}),
    ...(seasonsCount ? { seasonsCount } : {}),
    episodeInfo: cleanText(raw?.episodes_info, 120),
    honors,
    doubanUrl: `https://movie.douban.com/subject/${id}/`,
    updatedAt: now,
  };
}

export async function fetchDoubanMediaDetail(
  id: string,
  fetchImpl: FetchLike = fetch
): Promise<MediaDetail> {
  if (!isValidDoubanSubjectId(id)) {
    throw new Error("invalid Douban subject id");
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetchImpl(
        `https://m.douban.com/rexxar/api/v2/movie/${id}?ck=&for_mobile=1`,
        {
          headers: REQUEST_HEADERS,
          signal: controller.signal,
        }
      );
      if (!response.ok) {
        throw new Error(`upstream returned ${response.status}`);
      }
      const detail = parseDoubanMediaDetail(await response.json(), id);
      if (!detail) throw new Error("upstream returned invalid media detail");
      return detail;
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
