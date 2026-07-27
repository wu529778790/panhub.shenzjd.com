<template>
  <article class="hub-page">
    <nav class="hub-breadcrumbs" aria-label="面包屑导航">
      <NuxtLink to="/">首页</NuxtLink>
      <PhCaretRight :size="13" aria-hidden="true" />
      <span aria-current="page">{{ hub.label }}</span>
    </nav>

    <header class="hub-hero">
      <div>
        <p>{{ hub.label }}</p>
        <h1>{{ hub.title }}</h1>
      </div>
      <span>{{ hub.summary }}</span>
    </header>

    <section class="hub-index" :aria-labelledby="`${hub.kind}-index-title`">
      <header>
        <h2 :id="`${hub.kind}-index-title`">全部{{ hub.label }}</h2>
        <span v-if="hub.kind === 'intent'">
          {{ formattedLongTailKeywordCount }} 个长尾关键词 · {{ pages.length }} 个经过整理的入口
        </span>
        <span v-else>{{ pages.length }} 个经过整理的入口</span>
      </header>

      <div v-if="hub.kind === 'intent'" class="hub-groups">
        <section v-for="group in intentGroups" :key="group.name">
          <header>
            <h3>{{ group.name }}</h3>
            <span>{{ group.pages.length }} 个内容方向</span>
          </header>
          <nav :aria-label="`${group.name}组合搜索`">
            <NuxtLink v-for="page in group.pages" :key="page.path" :to="page.path">
              <span class="hub-index__copy">
                <strong>{{ page.title }}</strong>
                <small>{{ page.summary }}</small>
              </span>
              <PhArrowUpRight :size="19" aria-hidden="true" />
            </NuxtLink>
          </nav>
        </section>
      </div>

      <ol v-else>
        <li v-for="(page, index) in pages" :key="page.path">
          <NuxtLink :to="page.path">
            <span class="hub-index__number">{{ String(index + 1).padStart(2, "0") }}</span>
            <span class="hub-index__copy">
              <strong>{{ page.title }}</strong>
              <small>{{ page.summary }}</small>
            </span>
            <PhArrowUpRight :size="21" aria-hidden="true" />
          </NuxtLink>
        </li>
      </ol>
    </section>

    <aside class="hub-help">
      <div>
        <h2>不知道从哪里开始</h2>
        <p>先输入最核心的名称，结果出现后再按平台筛选。关键词越具体，结果通常越准确。</p>
      </div>
      <NuxtLink to="/guide/search-tips">
        阅读搜索技巧
        <PhArrowRight :size="17" aria-hidden="true" />
      </NuxtLink>
    </aside>
  </article>
</template>

<script setup lang="ts">
import {
  PhArrowRight,
  PhArrowUpRight,
  PhCaretRight,
} from "@phosphor-icons/vue";
import type { SeoHub, SeoPage } from "~/config/seoContent";

const props = defineProps<{ hub: SeoHub; pages: SeoPage[] }>();
const runtimeConfig = useRuntimeConfig();
const siteUrl = ((runtimeConfig.public?.siteUrl as string) || "https://haosouku.com").replace(/\/$/, "");
const canonical = `${siteUrl}${props.hub.path}`;
const longTailKeywordCount = computed(() =>
  props.pages.reduce(
    (total, page) =>
      total +
      (page.keywordGroups || []).reduce(
        (pageTotal, group) => pageTotal + group.keywords.length,
        0
      ),
    0
  )
);
const formattedLongTailKeywordCount = computed(() =>
  new Intl.NumberFormat("zh-CN").format(longTailKeywordCount.value)
);
const intentGroups = computed(() => {
  const grouped = new Map<string, SeoPage[]>();
  for (const page of props.pages) {
    const name =
      page.facts.find((fact) => fact.label === "网盘平台")?.value || "其他平台";
    const pages = grouped.get(name) || [];
    pages.push(page);
    grouped.set(name, pages);
  }
  return [...grouped.entries()].map(([name, pages]) => ({ name, pages }));
});

useSeoMeta({
  title: props.hub.seoTitle,
  description: props.hub.description,
  robots: "index,follow",
  ogType: "website",
  ogSiteName: "好搜库",
  ogTitle: props.hub.seoTitle,
  ogDescription: props.hub.description,
  ogUrl: canonical,
  ogImage: `${siteUrl}/og.png`,
  twitterCard: "summary_large_image",
  twitterTitle: props.hub.seoTitle,
  twitterDescription: props.hub.description,
  twitterImage: `${siteUrl}/og.png`,
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
            name: props.hub.seoTitle,
            description: props.hub.description,
            inLanguage: "zh-CN",
            dateModified: props.hub.updatedAt,
            isPartOf: { "@id": `${siteUrl}/#website` },
          },
          {
            "@type": "ItemList",
            itemListElement: props.pages.map((page, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: page.title,
              url: `${siteUrl}${page.path}`,
            })),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "首页", item: `${siteUrl}/` },
              { "@type": "ListItem", position: 2, name: props.hub.label, item: canonical },
            ],
          },
        ],
      }).replace(/</g, "\\u003c"),
    },
  ],
});
</script>

<style scoped>
.hub-page {
  width: 100%;
}

.hub-breadcrumbs {
  display: flex;
  min-height: 28px;
  align-items: center;
  gap: 7px;
  margin-bottom: 36px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.hub-breadcrumbs a:hover {
  color: var(--text-primary);
}

.hub-hero {
  display: grid;
  min-height: 330px;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.55fr);
  align-items: end;
  gap: clamp(50px, 10vw, 140px);
  padding: 36px 0 64px;
  border-bottom: 1px solid var(--border-light);
}

.hub-hero p {
  margin: 0 0 16px;
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.08em;
}

.hub-hero h1 {
  max-width: 760px;
  margin: 0;
  font-size: clamp(44px, 7vw, 76px);
  font-weight: 820;
  letter-spacing: -0.065em;
  line-height: 1.04;
  text-wrap: balance;
}

.hub-hero > span {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.9;
  text-wrap: pretty;
}

.hub-index {
  padding: 76px 0 54px;
}

.hub-index > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.hub-index h2 {
  margin: 0;
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 760;
  letter-spacing: -0.045em;
}

.hub-index > header span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.hub-index ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.hub-index li {
  border-bottom: 1px solid var(--border-light);
}

.hub-index ol a {
  display: grid;
  min-height: 108px;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 22px;
  padding: 18px 6px;
  transition: padding var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
}

.hub-index ol a:hover {
  padding-right: 14px;
  padding-left: 14px;
  background: var(--bg-hover);
  color: var(--primary-strong);
}

.hub-index__number {
  color: var(--text-tertiary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.hub-index__copy {
  display: grid;
  gap: 8px;
}

.hub-index__copy strong {
  font-size: 17px;
  font-weight: 720;
  letter-spacing: -0.025em;
}

.hub-index__copy small {
  max-width: 72ch;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
  text-wrap: pretty;
}

.hub-groups {
  display: grid;
  gap: 56px;
}

.hub-groups > section {
  display: grid;
  grid-template-columns: minmax(180px, 0.34fr) minmax(0, 1fr);
  gap: clamp(28px, 6vw, 76px);
  padding-top: 26px;
  border-top: 1px solid var(--border-light);
}

.hub-groups > section > header {
  align-self: start;
}

.hub-groups h3 {
  margin: 0;
  font-size: 21px;
  font-weight: 750;
  letter-spacing: -0.035em;
}

.hub-groups header span {
  display: block;
  margin-top: 8px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.hub-groups nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.hub-groups nav a {
  display: grid;
  min-height: 118px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: var(--radius-md);
  background: var(--bg-surface-subtle);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.hub-groups nav a:hover {
  background: var(--bg-hover);
  color: var(--primary-strong);
}

.hub-groups nav a:active {
  transform: translateY(1px);
}

.hub-groups nav small {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.hub-help {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 36px;
  margin: 30px 0 20px;
  padding: 36px 40px;
  border-radius: var(--radius-lg);
  background: var(--primary-soft);
}

.hub-help h2,
.hub-help p {
  margin: 0;
}

.hub-help h2 {
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 740;
  letter-spacing: -0.03em;
}

.hub-help p {
  max-width: 66ch;
  margin-top: 9px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.hub-help a {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  gap: 8px;
  color: var(--primary-strong);
  font-size: 13px;
  font-weight: 720;
  white-space: nowrap;
}

@media (max-width: 820px) {
  .hub-hero {
    min-height: auto;
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 20px 0 48px;
  }

  .hub-help {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .hub-groups > section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .hub-breadcrumbs {
    margin-bottom: 20px;
  }

  .hub-hero h1 {
    font-size: clamp(38px, 12vw, 52px);
  }

  .hub-index {
    padding-top: 58px;
  }

  .hub-index > header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .hub-index a {
    min-height: 116px;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 12px;
  }

  .hub-index__copy small {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .hub-help {
    padding: 28px 24px;
  }

  .hub-groups nav {
    grid-template-columns: 1fr;
  }
}
</style>
