<template>
  <div class="media-library">
    <header class="media-library__toolbar">
      <div class="media-kind-tabs" role="tablist" aria-label="影视大类">
        <button
          type="button"
          role="tab"
          :aria-selected="activeKind === 'movie'"
          :class="{ active: activeKind === 'movie' }"
          @click="activeKind = 'movie'">
          电影
          <span>{{ movieCount }}</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeKind === 'tv'"
          :class="{ active: activeKind === 'tv' }"
          @click="activeKind = 'tv'">
          电视剧
          <span>{{ tvCount }}</span>
        </button>
      </div>

      <div class="media-library__freshness">
        <strong>{{ activeItemCount }} 部全部展开</strong>
        <time v-if="updatedLabel" :datetime="updatedIso">
          {{ updatedLabel }} 更新
        </time>
        <NuxtLink class="media-library__archive" to="/media">
          影视资料库
          <PhArrowRight :size="14" aria-hidden="true" />
        </NuxtLink>
      </div>
    </header>

    <div
      v-if="status === 'pending' && !hasCollections"
      class="media-skeleton"
      aria-label="正在加载豆瓣片单"
      aria-live="polite">
      <section v-for="row in 3" :key="row">
        <header><i /><b /></header>
        <div>
          <span v-for="card in 8" :key="card"><i /><b /><em /></span>
        </div>
      </section>
    </div>

    <div v-else-if="activeCollections.length" class="media-streams">
      <section
        v-for="collection in activeCollections"
        :key="collection.id"
        class="media-stream"
        :aria-labelledby="`${collection.id}-title`">
        <header class="media-stream__header">
          <div>
            <h3 :id="`${collection.id}-title`">{{ collection.title }}</h3>
            <p>{{ collection.description }}</p>
          </div>
        </header>

        <div
          class="media-stream__grid"
          role="list"
          :aria-label="collection.title">
          <NuxtLink
            v-for="item in collection.items"
            :key="`${collection.id}-${item.id}`"
            class="media-card"
            :to="`/media/${item.id}`"
            role="listitem"
            :aria-label="`查看《${item.title}》资料与资源`">
            <span class="media-card__poster">
              <img
                v-if="!failedCovers.has(`${collection.id}-${item.id}`)"
                :src="proxyCover(item.cover)"
                :alt="`《${item.title}》海报`"
                width="320"
                height="448"
                loading="lazy"
                decoding="async"
                fetchpriority="low"
                referrerpolicy="no-referrer"
                @error="markCoverFailed(collection.id, item.id)" />
              <span v-else class="media-card__placeholder" aria-hidden="true">
                <PhFilmSlate :size="28" />
              </span>
            </span>

            <span class="media-card__copy">
              <strong>{{ item.title }}</strong>
              <span class="media-card__score">
                <span v-if="item.rating">
                  <PhStar :size="13" weight="fill" aria-hidden="true" />
                  {{ item.rating.toFixed(1) }}
                </span>
                <span v-if="item.year">{{ item.year }}</span>
              </span>
              <small>
                {{ item.genres.length ? item.genres.join(" / ") : item.progress }}
              </small>
            </span>
          </NuxtLink>
        </div>
      </section>
    </div>

    <div v-else class="media-library__empty" role="status" aria-live="polite">
      <PhFilmSlate :size="30" aria-hidden="true" />
      <div>
        <strong>豆瓣片单暂时没加载出来</strong>
        <span>会继续保留上次成功数据，也可以现在重新获取。</span>
      </div>
      <button type="button" :disabled="status === 'pending'" @click="refresh()">
        <PhArrowClockwise :size="16" aria-hidden="true" />
        {{ status === "pending" ? "更新中" : "重新获取" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  PhArrowClockwise,
  PhArrowRight,
  PhFilmSlate,
  PhStar,
} from "@phosphor-icons/vue";
import type {
  EntertainmentCollection,
  EntertainmentKind,
} from "~/server/core/services/entertainmentLatestService";

interface EntertainmentLatestResponse {
  code: 0;
  message: "success";
  data: {
    movies: EntertainmentCollection["items"];
    tv: EntertainmentCollection["items"];
    collections: EntertainmentCollection[];
    updatedAt: number;
    stale: boolean;
    cache: "D1" | "UPSTREAM";
  };
}

const runtimeConfig = useRuntimeConfig();
const siteUrl = (
  (runtimeConfig.public?.siteUrl as string) || "https://haosouku.com"
).replace(/\/$/, "");
const activeKind = ref<EntertainmentKind>("movie");
const failedCovers = ref(new Set<string>());

const { data: response, status, refresh } =
  await useFetch<EntertainmentLatestResponse>(
    "/api/entertainment-latest?catalog=v4",
    {
      key: "homepage-entertainment-streams-v4",
      default: () => ({
        code: 0,
        message: "success",
        data: {
          movies: [],
          tv: [],
          collections: [],
          updatedAt: 0,
          stale: true,
          cache: "UPSTREAM",
        },
      }),
    }
  );

const collections = computed(() => response.value.data.collections || []);
const hasCollections = computed(() => collections.value.length > 0);
const activeCollections = computed(() =>
  collections.value.filter(
    (collection) => collection.kind === activeKind.value
  )
);

function uniqueItemCount(kind: EntertainmentKind): number {
  return new Set(
    collections.value
      .filter((collection) => collection.kind === kind)
      .flatMap((collection) => collection.items.map((item) => item.id))
  ).size;
}

const movieCount = computed(() => uniqueItemCount("movie"));
const tvCount = computed(() => uniqueItemCount("tv"));
const activeItemCount = computed(() =>
  activeKind.value === "movie" ? movieCount.value : tvCount.value
);
const updatedIso = computed(() =>
  response.value.data.updatedAt
    ? new Date(response.value.data.updatedAt).toISOString()
    : ""
);
const updatedLabel = computed(() => {
  if (!response.value.data.updatedAt) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(response.value.data.updatedAt));
});

function proxyCover(url: string): string {
  return `/api/img?url=${encodeURIComponent(url)}&w=320&v=4`;
}

function markCoverFailed(collectionId: string, itemId: string) {
  const next = new Set(failedCovers.value);
  next.add(`${collectionId}-${itemId}`);
  failedCovers.value = next;
}

useHead(() => ({
  script: hasCollections.value
    ? [
        {
          key: "homepage-entertainment-lists",
          type: "application/ld+json",
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": collections.value.map((collection) => ({
              "@type": "ItemList",
              name: collection.title,
              description: collection.description,
              numberOfItems: collection.items.length,
              itemListElement: collection.items.slice(0, 8).map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                item: {
                  "@type": collection.kind === "movie" ? "Movie" : "TVSeries",
                  name: item.title,
                  url: `${siteUrl}/media/${item.id}`,
                  image: `${siteUrl}${proxyCover(item.cover)}`,
                  dateCreated: item.year || undefined,
                  genre: item.genres,
                  aggregateRating: item.rating && item.ratingCount
                    ? {
                        "@type": "AggregateRating",
                        ratingValue: item.rating,
                        ratingCount: item.ratingCount,
                        bestRating: 10,
                      }
                    : undefined,
                },
              })),
            })),
          }).replace(/</g, "\\u003c"),
        },
      ]
    : [],
}));
</script>

<style scoped>
.media-library {
  content-visibility: auto;
  contain-intrinsic-size: 1900px;
}

.media-library__toolbar {
  position: sticky;
  top: 74px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 0 -10px 30px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--border-light) 82%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-glass-strong) 92%, transparent);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

.media-kind-tabs {
  display: grid;
  padding: 3px;
  grid-template-columns: repeat(2, minmax(112px, 1fr));
  border-radius: 11px;
  background: var(--bg-secondary);
}

.media-kind-tabs button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 15px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 720;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.media-kind-tabs button span {
  color: var(--text-tertiary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.media-kind-tabs button.active {
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.media-kind-tabs button.active span {
  color: var(--primary-strong);
}

.media-library__freshness {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 8px;
  color: var(--text-tertiary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.media-library__freshness strong {
  color: var(--text-secondary);
  font-weight: 680;
}

.media-library__archive {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 5px;
  padding-left: 12px;
  border-left: 1px solid var(--border-light);
  color: var(--text-secondary);
  font-weight: 680;
  transition: color var(--transition-fast);
}

.media-library__archive:hover {
  color: var(--primary-strong);
}

.media-streams {
  display: grid;
  gap: clamp(30px, 4vw, 46px);
}

.media-stream {
  min-width: 0;
  content-visibility: auto;
  contain-intrinsic-size: 760px;
}

.media-stream__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 15px;
}

.media-stream__header h3,
.media-stream__header p {
  margin: 0;
}

.media-stream__header h3 {
  color: var(--text-primary);
  font-size: clamp(18px, 2vw, 23px);
  font-weight: 790;
  letter-spacing: -0.035em;
  line-height: 1.2;
}

.media-stream__header p {
  margin-top: 5px;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.5;
}

.media-stream__grid {
  display: grid;
  padding: 2px;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: clamp(18px, 2vw, 24px) clamp(10px, 1.2vw, 15px);
}

.media-card {
  display: block;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: inherit;
  text-align: left;
  transition: transform var(--transition-fast);
}

.media-card:active {
  transform: scale(0.98);
}

.media-card__poster {
  position: relative;
  display: grid;
  width: 100%;
  overflow: hidden;
  aspect-ratio: 5 / 7;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--border-light) 74%, transparent);
  border-radius: 11px;
  background: var(--bg-surface-subtle);
  color: var(--text-tertiary);
  box-shadow: 0 10px 24px rgba(29, 45, 33, 0.07);
  transition:
    transform var(--transition-normal),
    border-color var(--transition-normal),
    box-shadow var(--transition-normal);
}

.media-card:hover .media-card__poster {
  border-color: color-mix(in srgb, var(--primary) 44%, var(--border-light));
  box-shadow: 0 16px 34px rgba(29, 45, 33, 0.12);
  transform: translateY(-3px);
}

.media-card:focus-visible {
  outline: none;
}

.media-card:focus-visible .media-card__poster {
  outline: 3px solid color-mix(in srgb, var(--primary) 52%, transparent);
  outline-offset: 3px;
}

.media-card__poster img,
.media-card__placeholder {
  display: block;
  width: 100%;
  height: 100%;
}

.media-card__poster img {
  object-fit: cover;
}

.media-card__placeholder {
  display: grid;
  place-items: center;
}

.media-card__copy {
  display: block;
  min-width: 0;
  padding-top: 10px;
}

.media-card__copy strong {
  display: block;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 720;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-card__score {
  display: flex;
  min-height: 20px;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.media-card__score > span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.media-card__score > span:first-child {
  color: #a86d13;
  font-weight: 760;
}

.media-card__copy small {
  display: block;
  overflow: hidden;
  margin-top: 2px;
  color: var(--text-tertiary);
  font-size: 10px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-library__empty {
  display: flex;
  min-height: 160px;
  align-items: center;
  gap: 18px;
  padding: 28px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  color: var(--text-tertiary);
}

.media-library__empty div {
  display: grid;
  flex: 1;
  gap: 5px;
}

.media-library__empty strong {
  color: var(--text-primary);
  font-size: 14px;
}

.media-library__empty span {
  color: var(--text-secondary);
  font-size: 12px;
}

.media-library__empty button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  gap: 7px;
  padding: 0 14px;
  border: 1px solid var(--border-light);
  border-radius: 9px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 680;
}

.media-skeleton {
  display: grid;
  gap: 42px;
}

.media-skeleton section > header {
  display: grid;
  width: min(250px, 55%);
  gap: 7px;
  margin-bottom: 15px;
}

.media-skeleton section > header i,
.media-skeleton section > header b,
.media-skeleton section > div span i,
.media-skeleton section > div span b,
.media-skeleton section > div span em {
  display: block;
  border-radius: 8px;
  background: var(--bg-skeleton);
  animation: mediaPulse 1.4s ease-in-out infinite;
}

.media-skeleton section > header i {
  width: 46%;
  height: 22px;
}

.media-skeleton section > header b {
  width: 72%;
  height: 11px;
}

.media-skeleton section > div {
  display: grid;
  overflow: hidden;
  grid-template-columns: repeat(8, minmax(104px, 1fr));
  gap: 14px;
}

.media-skeleton section > div span {
  display: grid;
  gap: 8px;
}

.media-skeleton section > div span i {
  aspect-ratio: 5 / 7;
}

.media-skeleton section > div span b {
  width: 84%;
  height: 12px;
}

.media-skeleton section > div span em {
  width: 58%;
  height: 9px;
}

@keyframes mediaPulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 720px) {
  .media-library__toolbar {
    top: 70px;
    margin-right: -4px;
    margin-left: -4px;
  }

  .media-kind-tabs {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .media-library__freshness {
    display: none;
  }

  .media-streams {
    gap: 34px;
  }

  .media-stream__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    column-gap: 10px;
  }

  .media-card__copy strong {
    font-size: 12px;
  }

  .media-skeleton section > div {
    grid-template-columns: repeat(4, minmax(98px, 1fr));
  }
}

@media (max-width: 520px) {
  .media-library__toolbar {
    position: static;
    margin-bottom: 25px;
  }

  .media-stream__header p {
    max-width: 30ch;
  }

  .media-stream__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px 9px;
  }

  .media-skeleton section > div {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .media-library__empty {
    align-items: flex-start;
    flex-wrap: wrap;
    padding: 22px;
  }

  .media-library__empty button {
    width: 100%;
    justify-content: center;
  }
}

@media (prefers-color-scheme: dark) {
  .media-library__toolbar {
    border-color: var(--border-light);
  }

  .media-card__poster {
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
  }

  .media-card:hover .media-card__poster {
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .media-card,
  .media-card__poster {
    transition: none;
  }

  .media-card:hover .media-card__poster {
    transform: none;
  }

  .media-skeleton section > header i,
  .media-skeleton section > header b,
  .media-skeleton section > div span i,
  .media-skeleton section > div span b,
  .media-skeleton section > div span em {
    animation: none;
  }
}
</style>
