<template>
  <article class="media-detail">
    <nav class="media-breadcrumbs" aria-label="面包屑导航">
      <NuxtLink to="/">首页</NuxtLink>
      <PhCaretRight :size="13" aria-hidden="true" />
      <NuxtLink to="/media">影视资料库</NuxtLink>
      <PhCaretRight :size="13" aria-hidden="true" />
      <span aria-current="page">{{ detail.title }}</span>
    </nav>

    <header class="media-detail__hero">
      <figure class="media-detail__poster">
        <img
          :src="coverUrl"
          :alt="`《${detail.title}》海报`"
          width="640"
          height="896"
          fetchpriority="high"
          decoding="async"
          referrerpolicy="no-referrer" />
      </figure>

      <div class="media-detail__intro">
        <p class="media-detail__kind">{{ kindLabel }}资料</p>
        <h1>{{ detail.title }}</h1>
        <p v-if="detail.originalTitle" class="media-detail__original">
          {{ detail.originalTitle }}
        </p>

        <div class="media-detail__genres" aria-label="作品类型">
          <span v-for="genre in detail.genres" :key="genre">{{ genre }}</span>
        </div>

        <p v-if="leadIntro" class="media-detail__lead">{{ leadIntro }}</p>

        <dl class="media-detail__quick-facts">
          <div v-if="detail.directors.length">
            <dt>导演</dt>
            <dd>{{ names(detail.directors, 3) }}</dd>
          </div>
          <div v-if="detail.actors.length">
            <dt>主演</dt>
            <dd>{{ names(detail.actors, 6) }}</dd>
          </div>
          <div>
            <dt>{{ detail.kind === "tv" ? "剧集" : "片长" }}</dt>
            <dd>{{ runtimeLabel }}</dd>
          </div>
          <div>
            <dt>地区</dt>
            <dd>{{ detail.countries.join(" / ") || "暂无资料" }}</dd>
          </div>
        </dl>

        <div class="media-detail__actions">
          <button type="button" @click="scrollToResources">
            <PhMagnifyingGlass :size="18" aria-hidden="true" />
            查看相关资源
          </button>
          <NuxtLink to="/media">
            返回影视资料库
            <PhArrowRight :size="17" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>

      <aside class="media-detail__rating" aria-label="作品评分">
        <span>豆瓣评分</span>
        <strong v-if="detail.rating">{{ detail.rating.toFixed(1) }}</strong>
        <strong v-else>暂无</strong>
        <small v-if="detail.ratingCount">
          {{ formatCount(detail.ratingCount) }} 人评价
        </small>
        <small v-else>评分人数暂未收录</small>
        <div v-if="primaryHonor">
          <PhMedal :size="18" aria-hidden="true" />
          <span>{{ primaryHonor }}</span>
        </div>
      </aside>
    </header>

    <div class="media-detail__body">
      <main>
        <section class="media-detail__synopsis" aria-labelledby="synopsis-title">
          <h2 id="synopsis-title">{{ detail.kind === "tv" ? "剧集简介" : "剧情简介" }}</h2>
          <div v-if="introParagraphs.length">
            <p v-for="paragraph in introParagraphs" :key="paragraph">
              {{ paragraph }}
            </p>
          </div>
          <p v-else>
            这部作品的剧情简介暂未采集完整，可以先查看演职员和资源结果。
          </p>
        </section>

        <section class="media-detail__credits" aria-labelledby="credits-title">
          <h2 id="credits-title">主创人员</h2>
          <div>
            <article v-if="detail.directors.length">
              <h3>导演</h3>
              <p>{{ names(detail.directors) }}</p>
            </article>
            <article v-if="detail.actors.length">
              <h3>演员</h3>
              <p>{{ names(detail.actors) }}</p>
            </article>
          </div>
        </section>
      </main>

      <aside class="media-detail__facts" aria-labelledby="facts-title">
        <h2 id="facts-title">作品资料</h2>
        <dl>
          <div>
            <dt>年份</dt>
            <dd>{{ detail.year || "暂无资料" }}</dd>
          </div>
          <div v-if="detail.genres.length">
            <dt>类型</dt>
            <dd>{{ detail.genres.join(" / ") }}</dd>
          </div>
          <div v-if="detail.countries.length">
            <dt>制片地区</dt>
            <dd>{{ detail.countries.join(" / ") }}</dd>
          </div>
          <div v-if="detail.languages.length">
            <dt>语言</dt>
            <dd>{{ detail.languages.join(" / ") }}</dd>
          </div>
          <div v-if="detail.durations.length">
            <dt>片长</dt>
            <dd>{{ detail.durations.join(" / ") }}</dd>
          </div>
          <div v-if="detail.kind === 'tv' && detail.episodeCount">
            <dt>集数</dt>
            <dd>{{ detail.episodeCount }} 集</dd>
          </div>
          <div v-if="detail.kind === 'tv' && detail.seasonsCount">
            <dt>季数</dt>
            <dd>{{ detail.seasonsCount }} 季</dd>
          </div>
          <div v-if="detail.releaseDates.length">
            <dt>上映日期</dt>
            <dd>{{ detail.releaseDates.slice(0, 3).join(" / ") }}</dd>
          </div>
          <div v-if="detail.aliases.length">
            <dt>又名</dt>
            <dd>{{ detail.aliases.join(" / ") }}</dd>
          </div>
        </dl>
        <p>
          影视资料采集自豆瓣公开页面，服务端缓存后展示，每 2 小时检查更新。
        </p>
        <a
          :href="detail.doubanUrl"
          target="_blank"
          rel="noopener noreferrer nofollow">
          在豆瓣查看原始条目
          <PhArrowUpRight :size="15" aria-hidden="true" />
        </a>
      </aside>
    </div>

    <MediaResourceSection
      :title="detail.title"
      :year="detail.year"
      :kind="detail.kind"
      :suggestions="searchExamples" />

    <section v-if="related.length" class="media-detail__related" aria-labelledby="related-title">
      <header>
        <h2 id="related-title">相近作品</h2>
        <NuxtLink to="/media">查看影视资料库</NuxtLink>
      </header>
      <div>
        <NuxtLink
          v-for="item in related"
          :key="item.id"
          :to="getMediaCatalogPath(item)">
          <img
            :src="proxyCover(item.cover, 240)"
            :alt="`《${item.title}》海报`"
            width="240"
            height="336"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer" />
          <span>
            <strong>{{ item.title }}</strong>
            <small>{{ item.year }} / 评分 {{ item.rating.toFixed(1) }}</small>
          </span>
        </NuxtLink>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import {
  PhArrowRight,
  PhArrowUpRight,
  PhCaretRight,
  PhMagnifyingGlass,
  PhMedal,
} from "@phosphor-icons/vue";
import {
  getMediaCatalogEntry,
  getMediaCatalogPath,
  getMediaSearchExamples,
  getRelatedMedia,
  type MediaCatalogEntry,
} from "~/config/mediaCatalog";
import type {
  MediaDetail,
  MediaDetailPerson,
} from "~/server/core/services/mediaDetailService";

interface MediaDetailResponse {
  code: 0;
  message: "success";
  data: MediaDetail & {
    stale: boolean;
    cache: "D1" | "UPSTREAM";
  };
}

const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const siteUrl = String(
  runtimeConfig.public?.siteUrl || "https://haosouku.com"
).replace(/\/$/, "");
const id = String(route.params.id || "").trim();
const catalogEntry = getMediaCatalogEntry(id);

const {
  data: response,
  error: detailError,
} = await useFetch<MediaDetailResponse>(`/api/media/${encodeURIComponent(id)}`, {
  key: `media-detail-v1:${id}`,
});

function fallbackFromCatalog(entry: MediaCatalogEntry): MediaDetail {
  return {
    id: entry.id,
    kind: entry.kind,
    title: entry.title,
    originalTitle: "",
    year: entry.year,
    cover: entry.cover,
    rating: entry.rating,
    intro: "",
    genres: entry.genres,
    countries: [],
    languages: [],
    durations: [],
    directors: [],
    actors: [],
    aliases: [],
    releaseDates: [],
    episodeInfo: entry.kind === "tv" ? entry.progress : "",
    honors: entry.progress
      ? [{ title: entry.progress }]
      : [],
    doubanUrl: `https://movie.douban.com/subject/${entry.id}/`,
    updatedAt: Date.parse(entry.updatedAt) || 0,
  };
}

const detail = response.value?.data ||
  (catalogEntry ? fallbackFromCatalog(catalogEntry) : undefined);

if (!detail) {
  throw createError({
    statusCode: detailError.value?.statusCode === 400 ? 404 : 502,
    message:
      detailError.value?.data?.message ||
      "这部作品的资料暂时无法获取",
  });
}

const kindLabel = detail.kind === "movie" ? "电影" : "电视剧";
const canonical = `${siteUrl}/media/${detail.id}`;
const coverUrl = proxyCover(detail.cover, 640);
const socialImage = `${siteUrl}${coverUrl}`;
const introParagraphs = detail.intro
  .split(/\n+/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean);
const leadIntro = introParagraphs[0]?.slice(0, 150) || "";
const primaryHonor = detail.honors[0]
  ? `${detail.honors[0].title}${
      detail.honors[0].rank ? ` 第 ${detail.honors[0].rank} 名` : ""
    }`
  : "";
const runtimeLabel =
  detail.kind === "tv"
    ? detail.episodeInfo ||
      (detail.episodeCount ? `${detail.episodeCount} 集` : "集数待更新")
    : detail.durations.join(" / ") || "片长待更新";
const searchExamples = catalogEntry
  ? getMediaSearchExamples(catalogEntry)
  : createSearchExamples(detail);
const relationSeed: MediaCatalogEntry = catalogEntry || {
  id: detail.id,
  kind: detail.kind,
  title: detail.title,
  cover: detail.cover,
  rating: detail.rating || 0,
  year: detail.year || "2000",
  genres: detail.genres,
  progress: detail.episodeInfo || "",
  updatedAt: new Date(detail.updatedAt || Date.now())
    .toISOString()
    .slice(0, 10),
};
const related = getRelatedMedia(relationSeed);
const pageTitle = `${detail.title}剧情简介、豆瓣评分与${kindLabel}资源 - 好搜库`;
const pageDescription = createPageDescription(detail, kindLabel);

function proxyCover(url: string, width: number): string {
  return `/api/img?url=${encodeURIComponent(url)}&w=${width}&catalog=media-detail-v1`;
}

function names(people: MediaDetailPerson[], limit = people.length): string {
  return people
    .slice(0, limit)
    .map((person) => person.name)
    .join(" / ");
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function createSearchExamples(item: MediaDetail): string[] {
  const core = item.year ? `${item.title} ${item.year}` : item.title;
  const values =
    item.kind === "tv"
      ? [
          `${item.title} 全集`,
          `${item.title} 夸克网盘`,
          `${item.title} 115网盘`,
          `${core} 高清`,
          item.originalTitle,
        ]
      : [
          `${item.title} 网盘资源`,
          `${item.title} 夸克网盘`,
          `${item.title} 115网盘`,
          `${core} 4K 中文字幕`,
          item.originalTitle,
        ];
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
    .slice(0, 5);
}

function createPageDescription(item: MediaDetail, label: string): string {
  const intro = item.intro
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 76);
  const prefix = `查看${item.year ? `${item.year}年` : ""}${label}《${item.title}》的剧情简介、豆瓣评分、导演、演员和作品资料`;
  return `${prefix}，并搜索夸克、115、百度网盘及磁力资源。${intro}`.slice(
    0,
    165
  );
}

function schemaDuration(values: string[]): string | undefined {
  const minutes = values.join(" ").match(/(\d+)\s*分钟/)?.[1];
  return minutes ? `PT${minutes}M` : undefined;
}

function scrollToResources() {
  document
    .getElementById("media-resources")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  robots: "index,follow,max-image-preview:large",
  ogType: "video.movie",
  ogSiteName: "好搜库",
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogUrl: canonical,
  ogImage: socialImage,
  ogImageAlt: `《${detail.title}》海报`,
  ogImageWidth: 640,
  ogImageHeight: 896,
  twitterCard: "summary_large_image",
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: socialImage,
});

useHead({
  link: [
    { rel: "canonical", href: canonical },
    {
      rel: "preload",
      href: coverUrl,
      as: "image",
      fetchpriority: "high",
    },
  ],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: pageTitle,
            description: pageDescription,
            inLanguage: "zh-CN",
            dateModified: new Date(detail.updatedAt || Date.now())
              .toISOString()
              .slice(0, 10),
            isPartOf: { "@id": `${siteUrl}/#website` },
            mainEntity: { "@id": `${canonical}#title` },
            primaryImageOfPage: { "@id": `${canonical}#poster` },
          },
          {
            "@type": detail.kind === "movie" ? "Movie" : "TVSeries",
            "@id": `${canonical}#title`,
            name: detail.title,
            alternateName: [
              detail.originalTitle,
              ...detail.aliases,
            ].filter(Boolean),
            description: detail.intro || pageDescription,
            image: {
              "@type": "ImageObject",
              "@id": `${canonical}#poster`,
              url: socialImage,
              width: 640,
              height: 896,
            },
            dateCreated: detail.year || undefined,
            genre: detail.genres,
            countryOfOrigin: detail.countries.map((name) => ({
              "@type": "Country",
              name,
            })),
            inLanguage: detail.languages,
            duration:
              detail.kind === "movie"
                ? schemaDuration(detail.durations)
                : undefined,
            director: detail.directors.map((person) => ({
              "@type": "Person",
              name: person.name,
            })),
            actor: detail.actors.slice(0, 12).map((person) => ({
              "@type": "Person",
              name: person.name,
            })),
            numberOfEpisodes:
              detail.kind === "tv" ? detail.episodeCount : undefined,
            aggregateRating:
              detail.rating && detail.ratingCount
                ? {
                    "@type": "AggregateRating",
                    ratingValue: detail.rating,
                    ratingCount: detail.ratingCount,
                    bestRating: 10,
                    worstRating: 1,
                  }
                : undefined,
            sameAs: detail.doubanUrl,
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "首页",
                item: `${siteUrl}/`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "影视资料库",
                item: `${siteUrl}/media`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: detail.title,
                item: canonical,
              },
            ],
          },
        ],
      }).replace(/</g, "\\u003c"),
    },
  ],
});
</script>

<style scoped>
.media-detail {
  width: 100%;
}

.media-breadcrumbs {
  display: flex;
  min-height: 28px;
  align-items: center;
  gap: 7px;
  margin-bottom: 28px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.media-breadcrumbs span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-detail__hero {
  display: grid;
  grid-template-columns:
    minmax(220px, 0.38fr)
    minmax(0, 1fr)
    minmax(160px, 0.28fr);
  align-items: start;
  gap: clamp(30px, 5vw, 70px);
  padding: 14px 0 58px;
  border-bottom: 1px solid var(--border-light);
}

.media-detail__poster {
  width: min(100%, 330px);
  margin: 0;
  overflow: hidden;
  aspect-ratio: 5 / 7;
  border-radius: 14px;
  background: var(--bg-surface-subtle);
  box-shadow: 0 22px 54px color-mix(in srgb, var(--text-primary) 13%, transparent);
}

.media-detail__poster img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-detail__intro {
  min-width: 0;
  padding-top: 4px;
}

.media-detail__kind,
.media-detail__intro h1,
.media-detail__original,
.media-detail__lead,
.media-detail__quick-facts,
.media-detail__quick-facts dt,
.media-detail__quick-facts dd {
  margin: 0;
}

.media-detail__kind {
  margin-bottom: 13px;
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.04em;
}

.media-detail__intro h1 {
  max-width: 760px;
  color: var(--text-primary);
  font-size: clamp(40px, 5.5vw, 68px);
  font-weight: 830;
  letter-spacing: -0.065em;
  line-height: 1.02;
  text-wrap: balance;
}

.media-detail__original {
  margin-top: 10px;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
}

.media-detail__genres {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 18px;
}

.media-detail__genres span {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  padding: 0 9px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 660;
}

.media-detail__lead {
  display: -webkit-box;
  max-width: 62ch;
  overflow: hidden;
  margin-top: 22px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.85;
  text-wrap: pretty;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.media-detail__quick-facts {
  display: grid;
  max-width: 760px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 24px;
  margin-top: 26px;
  border-top: 1px solid var(--border-light);
}

.media-detail__quick-facts > div {
  display: grid;
  min-height: 48px;
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-light);
}

.media-detail__quick-facts dt {
  color: var(--text-tertiary);
  font-size: 10px;
}

.media-detail__quick-facts dd {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-detail__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 26px;
}

.media-detail__actions button,
.media-detail__actions a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  font-size: 12px;
  font-weight: 720;
  white-space: nowrap;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.media-detail__actions button {
  padding: 0 17px;
  border-radius: 10px;
  background: var(--primary);
  color: var(--text-on-primary);
  cursor: pointer;
}

.media-detail__actions button:hover {
  background: var(--primary-strong);
}

.media-detail__actions button:active {
  transform: scale(0.98);
}

.media-detail__actions a {
  color: var(--text-secondary);
}

.media-detail__actions a:hover {
  color: var(--primary-strong);
}

.media-detail__rating {
  display: grid;
  min-width: 0;
  gap: 7px;
  padding: 8px 0 0 clamp(18px, 3vw, 36px);
  border-left: 1px solid var(--border-light);
}

.media-detail__rating > span {
  color: var(--text-tertiary);
  font-size: 11px;
}

.media-detail__rating > strong {
  color: var(--primary-strong);
  font-size: clamp(40px, 5vw, 60px);
  font-weight: 800;
  letter-spacing: -0.065em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.media-detail__rating > small {
  color: var(--text-tertiary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.media-detail__rating > div {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border-light);
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.55;
}

.media-detail__rating > div svg {
  flex: 0 0 auto;
  color: var(--primary-strong);
}

.media-detail__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.36fr);
  gap: clamp(60px, 10vw, 138px);
  padding: 76px 0 20px;
}

.media-detail__body main {
  max-width: 780px;
}

.media-detail__body main section + section {
  margin-top: 66px;
}

.media-detail__body h2,
.media-detail__related h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(25px, 3vw, 34px);
  font-weight: 790;
  letter-spacing: -0.045em;
  line-height: 1.15;
}

.media-detail__synopsis p {
  max-width: 68ch;
  margin: 20px 0 0;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 2;
  text-wrap: pretty;
}

.media-detail__credits > div {
  display: grid;
  grid-template-columns: minmax(0, 0.34fr) minmax(0, 1fr);
  gap: 38px;
  margin-top: 24px;
}

.media-detail__credits article {
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.media-detail__credits h3,
.media-detail__credits p {
  margin: 0;
}

.media-detail__credits h3 {
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 650;
}

.media-detail__credits p {
  margin-top: 10px;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.9;
}

.media-detail__facts {
  align-self: start;
  padding: 22px;
  border-radius: 14px;
  background: var(--bg-secondary);
}

.media-detail__facts h2 {
  font-size: 18px;
}

.media-detail__facts dl {
  margin: 20px 0 0;
}

.media-detail__facts dl > div {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 12px;
  padding: 10px 0;
}

.media-detail__facts dl > div + div {
  border-top: 1px solid var(--border-light);
}

.media-detail__facts dt,
.media-detail__facts dd {
  margin: 0;
  font-size: 10px;
  line-height: 1.6;
}

.media-detail__facts dt {
  color: var(--text-tertiary);
}

.media-detail__facts dd {
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-weight: 620;
}

.media-detail__facts > p {
  margin: 18px 0 0;
  color: var(--text-tertiary);
  font-size: 10px;
  line-height: 1.7;
}

.media-detail__facts > a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 680;
}

.media-detail__facts > a:hover {
  color: var(--primary-strong);
}

.media-detail__related {
  padding: 70px 0 28px;
  border-top: 1px solid var(--border-light);
}

.media-detail__related > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.media-detail__related > header a {
  color: var(--text-tertiary);
  font-size: 11px;
}

.media-detail__related > div {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 20px;
}

.media-detail__related > div > a {
  display: grid;
  min-width: 0;
  gap: 10px;
  color: inherit;
}

.media-detail__related img {
  display: block;
  width: 100%;
  aspect-ratio: 5 / 7;
  border-radius: 11px;
  object-fit: cover;
  transition: transform var(--transition-normal);
}

.media-detail__related a:hover img {
  transform: translateY(-3px);
}

.media-detail__related span {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.media-detail__related strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 710;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-detail__related small {
  color: var(--text-tertiary);
  font-size: 10px;
}

@media (max-width: 980px) {
  .media-detail__hero {
    grid-template-columns: minmax(200px, 0.36fr) minmax(0, 1fr);
  }

  .media-detail__rating {
    grid-column: 2;
    grid-template-columns: auto auto;
    align-items: end;
    padding: 20px 0 0;
    border-top: 1px solid var(--border-light);
    border-left: 0;
  }

  .media-detail__rating > strong {
    grid-row: 1 / span 2;
    grid-column: 1;
  }

  .media-detail__rating > span,
  .media-detail__rating > small {
    grid-column: 2;
  }

  .media-detail__rating > div {
    grid-column: 1 / -1;
  }

  .media-detail__related > div {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .media-detail__hero {
    grid-template-columns: 1fr;
    padding-bottom: 48px;
  }

  .media-detail__intro {
    order: 1;
  }

  .media-detail__poster {
    order: 2;
    width: min(66vw, 310px);
  }

  .media-detail__rating {
    order: 3;
    grid-column: auto;
  }

  .media-detail__body {
    grid-template-columns: 1fr;
    gap: 54px;
    padding-top: 58px;
  }

  .media-detail__facts {
    max-width: 580px;
  }

  .media-detail__related > div {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px 12px;
  }
}

@media (max-width: 520px) {
  .media-detail__intro h1 {
    font-size: clamp(38px, 12vw, 54px);
  }

  .media-detail__quick-facts,
  .media-detail__credits > div {
    grid-template-columns: 1fr;
  }

  .media-detail__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .media-detail__actions button,
  .media-detail__actions a {
    width: 100%;
  }

  .media-detail__rating {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .media-detail__related > div {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .media-detail__actions button,
  .media-detail__related img {
    transition: none;
  }

  .media-detail__related a:hover img {
    transform: none;
  }
}
</style>
