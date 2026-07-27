/**
 * 豆瓣影视榜单服务
 * 使用豆瓣 JSON API (/j/chart/top_list) 获取数据，替代 HTML 爬虫
 *
 * 优点：返回结构化 JSON，无需 cheerio 解析，自带封面 URL，更稳定
 */

import { ofetch } from "ofetch";
import { load } from "cheerio";
import { DOUBAN_HOT_SOURCES, type DoubanHotSourceConfig } from "../../../config/doubanHot";
import { MemoryCache } from "../cache/memoryCache";

export interface DoubanHotItem {
  id?: number;
  title: string;
  url?: string;
  cover?: string;
  desc?: string;
  hot?: number;
}

export interface DoubanHotPageResult {
  items: DoubanHotItem[];
  hasMore: boolean;
}

export function isUsableDoubanHotPage(
  result: DoubanHotPageResult,
  page: number
): boolean {
  return page > 1 || result.items.length > 0;
}

/** 豆瓣 top_list API 返回的原始结构 */
interface DoubanApiItem {
  id: string;
  title: string;
  score: string;
  rating: string[];
  cover_url: string;
  url: string;
  types: string[];
  regions: string[];
  actors: string[];
  release_date: string;
  vote_count: number;
  rank: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时（榜单一天更新一次即可）
const API_BASE = "https://movie.douban.com/j/chart/top_list";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const PAGE_SIZE = 20;

const allItemsCache = new MemoryCache<DoubanHotItem[]>({ maxSize: 30 });
const categoryPageCache = new MemoryCache<DoubanHotPageResult>({ maxSize: 240 });
const top250PageCache = new MemoryCache<DoubanHotPageResult>({ maxSize: 20 });
const top250SourcePageCache = new MemoryCache<DoubanHotItem[]>({ maxSize: 10 });

/** 将豆瓣 API 返回的 item 转为 DoubanHotItem */
function mapItem(raw: DoubanApiItem, index: number): DoubanHotItem {
  const score = raw.score || raw.rating?.[0] || "";
  const title = score ? `【${score}】${raw.title}` : raw.title;
  const desc = [raw.types?.join("/"), raw.regions?.join("/")]
    .filter(Boolean)
    .join(" · ");

  return {
    id: Number(raw.id) || undefined,
    title,
    cover: raw.cover_url || undefined,
    desc,
    url: raw.url || `https://movie.douban.com/subject/${raw.id}/`,
  };
}

/**
 * 从豆瓣 JSON API 获取指定类型的榜单
 * @param typeId 豆瓣分类 ID（0=Top250, 3=剧情, 5=动作, ...）
 * @param limit 获取数量
 */
async function fetchTopList(typeId: number, limit = 50): Promise<DoubanHotItem[]> {
  const allItems: DoubanHotItem[] = [];
  const batchSize = Math.min(limit, PAGE_SIZE);

  for (let start = 0; start < limit; start += batchSize) {
    const url = `${API_BASE}?type=${typeId}&interval_id=100:90&action=&start=${start}&limit=${batchSize}`;

    try {
      const data = await ofetch<DoubanApiItem[]>(url, {
        headers: { "user-agent": UA },
        timeout: 10000,
      });

      if (!Array.isArray(data) || data.length === 0) break;

      for (let i = 0; i < data.length; i++) {
        allItems.push(mapItem(data[i], start + i));
      }

      // 如果返回的数据少于请求数，说明没有更多了
      if (data.length < batchSize) break;
    } catch (e: any) {
      console.warn(`[DoubanAPI] type=${typeId} start=${start} 失败:`, e?.message);
      break;
    }
  }

  return allItems;
}

/** 按页获取普通分类。每次滚动只请求当前页，避免首屏预抓整份榜单。 */
async function fetchTopListPage(
  typeId: number,
  page: number,
  limit: number
): Promise<DoubanHotPageResult> {
  const cacheKey = `douban-page:${typeId}:${page}:${limit}`;
  const cached = categoryPageCache.get(cacheKey);
  if (cached.hit && cached.value) return cached.value;

  const start = (page - 1) * limit;
  const url = `${API_BASE}?type=${typeId}&interval_id=100:90&action=&start=${start}&limit=${limit}`;
  const data = await ofetch<DoubanApiItem[]>(url, {
    headers: { "user-agent": UA },
    timeout: 10000,
  });
  const sourceItems = Array.isArray(data) ? data : [];
  const result = {
    items: sourceItems.map((item, index) => mapItem(item, start + index)),
    hasMore: sourceItems.length === limit,
  };

  // 首页空数组通常是豆瓣临时限流，不能把故障结果缓存 24 小时。
  if (isUsableDoubanHotPage(result, page)) {
    categoryPageCache.set(cacheKey, result, CACHE_TTL_MS);
  }
  return result;
}

/**
 * Top250 专用爬虫（该分类不支持 JSON API，需爬 HTML）
 */
const TOP250_PAGE_SIZE = 25;
const TOP250_TOTAL = 250;
const TOP250_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15";

function parseTop250Page(html: string): DoubanHotItem[] {
  const items: DoubanHotItem[] = [];
  const $ = load(html);

  $(".article ol.grid_view li").each((_, el) => {
    const dom = $(el);
    const href = dom.find(".pic a").attr("href") || "";
    const id = Number(href.match(/\d+/)?.[0]) || undefined;
    const rawTitle = dom.find(".info .title").first().text() || "";
    const score = dom.find(".info .rating_num").text().trim() || "0.0";
    const title = rawTitle ? `【${score}】${rawTitle}` : "";
    if (!title) return;

    const img = dom.find("img");
    const cover = img.attr("data-src") || img.attr("src") || undefined;
    const coverUrl = cover?.startsWith("//") ? "https:" + cover : cover;

    items.push({
      id,
      title,
      cover: coverUrl,
      desc: dom.find(".info .inq").text().trim(),
      url: href || `https://movie.douban.com/subject/${id}/`,
    });
  });

  return items;
}

async function fetchTop250SourcePage(start: number): Promise<DoubanHotItem[]> {
  const cacheKey = `top250-source:${start}`;
  const cached = top250SourcePageCache.get(cacheKey);
  if (cached.hit && cached.value) return cached.value;

  const url = start === 0
    ? "https://movie.douban.com/top250"
    : `https://movie.douban.com/top250?start=${start}`;
  const html = await ofetch<string>(url, {
    headers: { "user-agent": TOP250_UA },
    timeout: 10000,
  });
  const items = parseTop250Page(html);
  if (items.length > 0) top250SourcePageCache.set(cacheKey, items, CACHE_TTL_MS);
  return items;
}

/** 只抓取当前请求覆盖到的 Top250 页面，避免首屏为 25 条数据预抓全部 250 条。 */
async function fetchTop250Page(page: number, limit: number): Promise<DoubanHotPageResult> {
  const cacheKey = `top250:${page}:${limit}`;
  const cached = top250PageCache.get(cacheKey);
  if (cached.hit && cached.value) return cached.value;

  const requestedStart = (page - 1) * limit;
  if (requestedStart >= TOP250_TOTAL) {
    return { items: [], hasMore: false };
  }

  const requestedEnd = Math.min(requestedStart + limit, TOP250_TOTAL);
  const firstSourceStart = Math.floor(requestedStart / TOP250_PAGE_SIZE) * TOP250_PAGE_SIZE;
  const lastSourceStart = Math.floor((requestedEnd - 1) / TOP250_PAGE_SIZE) * TOP250_PAGE_SIZE;
  const sourceStarts: number[] = [];
  for (let start = firstSourceStart; start <= lastSourceStart; start += TOP250_PAGE_SIZE) {
    sourceStarts.push(start);
  }

  const sourcePages = await Promise.all(sourceStarts.map(fetchTop250SourcePage));
  const combined = sourcePages.flat();
  const offset = requestedStart - firstSourceStart;
  const items = combined.slice(offset, offset + limit);
  const result = {
    items,
    hasMore: requestedStart + items.length < TOP250_TOTAL,
  };
  if (items.length > 0) top250PageCache.set(cacheKey, result, CACHE_TTL_MS);
  return result;
}

async function scrapeTop250(): Promise<DoubanHotItem[]> {
  const allItems: DoubanHotItem[] = [];

  for (let page = 0; page < 10; page++) {
    const start = page * 25;

    try {
      allItems.push(...await fetchTop250SourcePage(start));

      if (page < 9) await new Promise((r) => setTimeout(r, 1500));
    } catch {
      if (page >= 1 && allItems.length === 0) break;
    }
  }

  return allItems;
}

/** 获取指定分类的全部数据（带缓存） */
async function fetchAllItems(categoryId: string): Promise<DoubanHotItem[]> {
  const cacheKey = `douban-api:${categoryId}`;
  const cached = allItemsCache.get(cacheKey);
  if (cached.hit && cached.value) return cached.value;

  const config = DOUBAN_HOT_SOURCES.find((s) => s.id === categoryId);
  if (!config) return [];

  // Top250 不支持 JSON API，用独立爬虫
  const items = config.typeId === -1
    ? await scrapeTop250()
    : await fetchTopList(config.typeId);
  if (items.length > 0) {
    allItemsCache.set(cacheKey, items, CACHE_TTL_MS);
  }
  return items;
}

export function extractSearchTerm(title: string): string {
  return title.replace(/^【[\d.]+】/, "").trim() || title;
}

/** 分页获取指定分类的数据 */
export async function fetchDoubanHotByCategory(
  category: string,
  page: number = 1,
  limit: number = PAGE_SIZE
): Promise<DoubanHotPageResult> {
  const config = DOUBAN_HOT_SOURCES.find((source) => source.id === category);
  if (!config) return { items: [], hasMore: false };
  if (config?.typeId === -1) {
    return fetchTop250Page(page, limit);
  }
  return fetchTopListPage(config.typeId, page, limit);
}

/** 获取所有分类的数据 */
export async function fetchDoubanHot(
  categories?: string[]
): Promise<{ categories: Record<string, { id: string; label: string; title: string; type: string; items: DoubanHotItem[] }> }> {
  const ids = categories?.length
    ? categories
    : DOUBAN_HOT_SOURCES.map((s) => s.id);

  const results: Record<string, { id: string; label: string; title: string; type: string; items: DoubanHotItem[] }> = {};

  await Promise.all(
    ids.map(async (id) => {
      const config = DOUBAN_HOT_SOURCES.find((s) => s.id === id);
      if (!config) return;

      try {
        const items = await fetchAllItems(id);
        results[id] = {
          id: config.id,
          label: config.label,
          title: config.label,
          type: config.type,
          items,
        };
      } catch (e: any) {
        results[id] = {
          id: config.id,
          label: config.label,
          title: config.label,
          type: config.type,
          items: [],
        };
        console.warn(`[DoubanAPI] ${id} 失败:`, e?.message);
      }
    })
  );

  return { categories: results };
}
