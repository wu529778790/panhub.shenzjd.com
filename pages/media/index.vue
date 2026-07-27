<template>
  <article class="media-hub">
    <nav class="media-breadcrumbs" aria-label="面包屑导航">
      <NuxtLink to="/">首页</NuxtLink>
      <PhCaretRight :size="13" aria-hidden="true" />
      <span aria-current="page">影视资料库</span>
    </nav>

    <header class="media-hub__hero">
      <div>
        <p>影视搜索</p>
        <h1>从具体片名开始找</h1>
        <span>整理高评分经典电影与近期剧集，先确认年份、版本和集数，再发起网盘搜索。</span>
      </div>
      <dl>
        <div>
          <dt>电影</dt>
          <dd>{{ movieEntries.length }} 部</dd>
        </div>
        <div>
          <dt>电视剧</dt>
          <dd>{{ tvEntries.length }} 部</dd>
        </div>
        <div>
          <dt>收录标准</dt>
          <dd>评分不低于 6.0</dd>
        </div>
      </dl>
    </header>

    <section
      v-for="group in groups"
      :key="group.kind"
      class="media-hub__group"
      :aria-labelledby="`media-${group.kind}`">
      <header>
        <h2 :id="`media-${group.kind}`">{{ group.label }}</h2>
        <span>{{ group.entries.length }} 个搜索入口</span>
      </header>

      <div class="media-hub__grid">
        <NuxtLink
          v-for="entry in group.entries"
          :key="entry.id"
          :to="getMediaCatalogPath(entry)"
          class="media-hub__card">
          <span class="media-hub__poster">
            <img
              :src="proxyCover(entry.cover)"
              :alt="`《${entry.title}》海报`"
              width="320"
              height="448"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer" />
          </span>
          <span class="media-hub__copy">
            <strong>{{ entry.title }}</strong>
            <span>
              <small>{{ entry.year }}</small>
              <small>评分 {{ entry.rating.toFixed(1) }}</small>
            </span>
            <small>{{ entry.genres.join(" / ") }}</small>
          </span>
          <PhArrowUpRight :size="18" aria-hidden="true" />
        </NuxtLink>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import {
  PhArrowUpRight,
  PhCaretRight,
} from "@phosphor-icons/vue";
import {
  getMediaCatalogPath,
  getMediaDescription,
  getMediaSeoTitle,
  mediaCatalogEntries,
} from "~/config/mediaCatalog";

const runtimeConfig = useRuntimeConfig();
const siteUrl = String(
  runtimeConfig.public?.siteUrl || "https://haosouku.com"
).replace(/\/$/, "");
const canonical = `${siteUrl}/media`;
const movieEntries = mediaCatalogEntries.filter((entry) => entry.kind === "movie");
const tvEntries = mediaCatalogEntries.filter((entry) => entry.kind === "tv");
const groups = [
  { kind: "movie", label: "电影", entries: movieEntries },
  { kind: "tv", label: "电视剧", entries: tvEntries },
];

function proxyCover(url: string): string {
  return `/api/img?url=${encodeURIComponent(url)}&w=320&catalog=media-v1`;
}

useSeoMeta({
  title: "电影电视剧网盘资源搜索资料库 - 好搜库",
  description:
    "按具体片名查看高评分电影和近期电视剧的网盘搜索写法，核对年份、清晰度、字幕、集数和更新时间后再打开公开分享结果。",
  robots: "index,follow",
  ogType: "website",
  ogSiteName: "好搜库",
  ogTitle: "电影电视剧网盘资源搜索资料库 - 好搜库",
  ogDescription:
    "从具体片名进入，按年份、版本、字幕和集数查找公开网盘索引。",
  ogUrl: canonical,
  ogImage: `${siteUrl}/movie-topic-hero.jpg`,
  twitterCard: "summary_large_image",
});

useHead({
  link: [{ rel: "canonical", href: canonical }],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: "电影电视剧网盘资源搜索资料库",
            description:
              "按具体片名查看高评分电影和近期电视剧的网盘搜索写法。",
            inLanguage: "zh-CN",
            dateModified: "2026-07-25",
            isPartOf: { "@id": `${siteUrl}/#website` },
          },
          {
            "@type": "ItemList",
            numberOfItems: mediaCatalogEntries.length,
            itemListElement: mediaCatalogEntries.map((entry, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: getMediaSeoTitle(entry),
              description: getMediaDescription(entry),
              url: `${siteUrl}${getMediaCatalogPath(entry)}`,
            })),
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
.media-hub {
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

.media-hub__hero {
  display: grid;
  min-height: 340px;
  grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.55fr);
  align-items: end;
  gap: clamp(48px, 8vw, 112px);
  padding: 28px 0 64px;
  border-bottom: 1px solid var(--border-light);
}

.media-hub__hero p,
.media-hub__hero h1,
.media-hub__hero span,
.media-hub__hero dl,
.media-hub__hero dt,
.media-hub__hero dd {
  margin: 0;
}

.media-hub__hero p {
  margin-bottom: 16px;
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.06em;
}

.media-hub__hero h1 {
  max-width: 760px;
  font-size: clamp(44px, 7vw, 72px);
  font-weight: 820;
  letter-spacing: -0.065em;
  line-height: 1.04;
}

.media-hub__hero > div > span {
  display: block;
  max-width: 44ch;
  margin-top: 22px;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.8;
}

.media-hub__hero dl {
  display: grid;
}

.media-hub__hero dl > div {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid var(--border-light);
}

.media-hub__hero dt {
  color: var(--text-tertiary);
  font-size: 12px;
}

.media-hub__hero dd {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
}

.media-hub__group {
  padding: 72px 0 20px;
}

.media-hub__group > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 26px;
}

.media-hub__group h2 {
  margin: 0;
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 780;
  letter-spacing: -0.05em;
}

.media-hub__group > header span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.media-hub__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 34px 20px;
}

.media-hub__card {
  position: relative;
  display: grid;
  min-width: 0;
  gap: 13px;
  color: var(--text-primary);
}

.media-hub__card > svg {
  position: absolute;
  right: 8px;
  bottom: 8px;
  color: var(--text-tertiary);
  opacity: 0;
  transform: translate(-4px, 4px);
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.media-hub__card:hover > svg {
  opacity: 1;
  transform: translate(0, 0);
}

.media-hub__poster {
  display: block;
  overflow: hidden;
  aspect-ratio: 5 / 7;
  border-radius: var(--radius-md);
  background: var(--bg-surface-subtle);
}

.media-hub__poster img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow), filter var(--transition-slow);
}

.media-hub__card:hover img {
  filter: contrast(1.03);
  transform: scale(1.018);
}

.media-hub__copy {
  display: grid;
  min-width: 0;
  gap: 7px;
  padding-right: 22px;
}

.media-hub__copy strong {
  overflow: hidden;
  font-size: 14px;
  font-weight: 730;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-hub__copy > span {
  display: flex;
  gap: 10px;
}

.media-hub__copy small {
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1040px) {
  .media-hub__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .media-hub__hero {
    min-height: auto;
    grid-template-columns: 1fr;
    gap: 42px;
    padding-bottom: 48px;
  }

  .media-hub__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .media-hub__hero h1 {
    font-size: clamp(39px, 13vw, 54px);
  }

  .media-hub__group {
    padding-top: 54px;
  }

  .media-hub__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px 14px;
  }
}
</style>
