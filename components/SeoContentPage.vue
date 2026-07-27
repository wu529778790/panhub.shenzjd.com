<template>
  <article
    class="seo-page"
    :class="{
      'seo-page--editorial': isEditorialPage,
      'seo-page--cinema': isCinemaPage,
    }">
    <nav class="breadcrumbs" aria-label="面包屑导航">
      <NuxtLink to="/">首页</NuxtLink>
      <PhCaretRight :size="13" aria-hidden="true" />
      <NuxtLink :to="hubPath">{{ hubLabel }}</NuxtLink>
      <PhCaretRight :size="13" aria-hidden="true" />
      <span aria-current="page">{{ page.title }}</span>
    </nav>

    <header v-if="isCinemaPage" class="seo-hero seo-hero--cinema">
      <div class="seo-hero__copy">
        <p>{{ page.eyebrow }}</p>
        <h1>{{ page.title }}</h1>
        <span>{{ page.summary }}</span>
        <div class="seo-actions">
          <button
            v-if="page.searchKeyword"
            type="button"
            class="seo-primary-action"
            @click="runSearch(page.searchKeyword)">
            <PhMagnifyingGlass :size="18" aria-hidden="true" />
            立即搜索
          </button>
          <NuxtLink class="seo-text-action" :to="hubPath">
            查看全部{{ hubLabel }}
            <PhArrowRight :size="17" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>

      <figure class="cinema-visual">
        <picture v-if="page.heroImage">
          <source :srcset="page.heroImage.src" type="image/webp" />
          <img
            :src="page.heroImage.fallback"
            :width="page.heroImage.width"
            :height="page.heroImage.height"
            :alt="page.heroImage.alt"
            fetchpriority="high" />
        </picture>
      </figure>
    </header>

    <header v-else-if="isTopicPage" class="seo-hero seo-hero--topic">
      <div class="seo-hero__copy">
        <p>{{ page.eyebrow }}</p>
        <h1>{{ page.title }}</h1>
        <span>{{ page.summary }}</span>
        <div class="seo-actions">
          <button
            v-if="page.searchKeyword"
            type="button"
            class="seo-primary-action"
            @click="runSearch(page.searchKeyword)">
            <PhMagnifyingGlass :size="18" aria-hidden="true" />
            立即搜索
          </button>
          <NuxtLink class="seo-text-action" :to="hubPath">
            查看全部{{ hubLabel }}
            <PhArrowRight :size="17" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>

      <figure class="topic-visual">
        <picture v-if="page.heroImage">
          <source :srcset="page.heroImage.src" type="image/webp" />
          <img
            :src="page.heroImage.fallback"
            :width="page.heroImage.width"
            :height="page.heroImage.height"
            :alt="page.heroImage.alt"
            fetchpriority="high" />
        </picture>
      </figure>
    </header>

    <header v-else class="seo-hero">
      <div class="seo-hero__copy">
        <p>{{ page.eyebrow }}</p>
        <h1>{{ page.title }}</h1>
        <span>{{ page.summary }}</span>
        <div class="seo-actions">
          <button
            v-if="page.searchKeyword"
            type="button"
            class="seo-primary-action"
            @click="runSearch(page.searchKeyword)">
            <PhMagnifyingGlass :size="18" aria-hidden="true" />
            立即搜索
          </button>
          <NuxtLink class="seo-text-action" :to="hubPath">
            查看全部{{ hubLabel }}
            <PhArrowRight :size="17" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>

      <dl class="seo-facts" aria-label="页面信息">
        <div v-for="fact in page.facts" :key="fact.label">
          <dt>{{ fact.label }}</dt>
          <dd>{{ fact.value }}</dd>
        </div>
        <div>
          <dt>内容更新</dt>
          <dd>{{ formattedUpdatedAt }}</dd>
        </div>
      </dl>
    </header>

    <dl v-if="isEditorialPage" class="seo-facts seo-facts--band" aria-label="专题信息">
      <div v-for="fact in page.facts" :key="fact.label">
        <dt>{{ fact.label }}</dt>
        <dd>{{ fact.value }}</dd>
      </div>
      <div>
        <dt>内容更新</dt>
        <dd>{{ formattedUpdatedAt }}</dd>
      </div>
    </dl>

    <section
      v-if="page.answer"
      class="geo-answer"
      aria-labelledby="geo-answer-title">
      <div>
        <p>直接回答</p>
        <h2 id="geo-answer-title">{{ page.title }}</h2>
      </div>
      <p>{{ page.answer }}</p>
    </section>

    <template v-if="isEditorialPage">
      <nav class="editorial-nav" aria-label="页内导航">
        <span>本页内容</span>
        <a
          v-for="(section, index) in page.sections"
          :key="section.title"
          :href="`#${sectionId(index)}`">
          {{ section.title }}
        </a>
        <a v-if="page.searchExamples?.length" href="#search-examples">搜索示例</a>
        <a v-if="keywordGroups.length" href="#long-tail-keywords">长尾关键词</a>
      </nav>

      <div class="editorial-body">
        <div class="editorial-article">
          <section
            v-for="(section, index) in page.sections"
            :id="sectionId(index)"
            :key="section.title"
            class="editorial-section"
            :class="`editorial-section--${sectionLayout(index)}`">
            <h2>{{ section.title }}</h2>
            <div class="editorial-section__copy">
              <p v-for="paragraph in section.paragraphs" :key="paragraph">
                {{ paragraph }}
              </p>
              <ul v-if="section.points?.length">
                <li v-for="point in section.points" :key="point">{{ point }}</li>
              </ul>
            </div>
          </section>
        </div>

        <section
          v-if="page.searchExamples?.length"
          id="search-examples"
          class="editorial-examples">
          <header>
            <h2>把关键词写得更具体</h2>
            <p>可以直接搜索，也可以替换成你要找的名称、年份、版本或格式。</p>
          </header>
          <ul aria-label="搜索词示例">
            <li v-for="example in page.searchExamples" :key="example">
              <button
                type="button"
                :aria-label="`搜索${example}`"
                @click="runSearch(example)">
                <PhMagnifyingGlass :size="17" aria-hidden="true" />
                <span>{{ example }}</span>
                <PhArrowUpRight :size="17" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>

        <section
          v-if="keywordGroups.length"
          id="long-tail-keywords"
          class="keyword-library"
          aria-labelledby="keyword-library-title">
          <header>
            <div>
              <p>长尾关键词库</p>
              <h2 id="keyword-library-title">换一种写法继续找</h2>
            </div>
            <span>{{ keywordCount }} 个可直接搜索的具体写法</span>
          </header>

          <div class="keyword-library__groups">
            <details
              v-for="(group, index) in keywordGroups"
              :key="group.label"
              :open="index === 0">
              <summary>
                <span>
                  <strong>{{ group.label }}</strong>
                  <small>{{ group.description }}</small>
                </span>
                <span class="keyword-library__count">{{ group.keywords.length }} 个</span>
                <PhCaretDown :size="17" aria-hidden="true" />
              </summary>
              <nav :aria-label="`${group.label}长尾关键词`">
                <button
                  v-for="keyword in group.keywords"
                  :key="keyword"
                  type="button"
                  :aria-label="`搜索${keyword}`"
                  @click="runSearch(keyword)">
                  <span>{{ keyword }}</span>
                  <PhArrowUpRight :size="16" aria-hidden="true" />
                </button>
              </nav>
            </details>
          </div>
        </section>

        <aside
          v-if="relatedPages.length"
          class="editorial-related"
          aria-labelledby="editorial-related-title">
          <header>
            <h2 id="editorial-related-title">接着查看</h2>
            <NuxtLink :to="hubPath">
              全部{{ hubLabel }}
              <PhArrowRight :size="16" aria-hidden="true" />
            </NuxtLink>
          </header>
          <nav aria-label="相关页面">
            <NuxtLink v-for="item in relatedPages" :key="item.path" :to="item.path">
              <small>{{ item.eyebrow }}</small>
              <strong>{{ item.title }}</strong>
              <p>{{ item.summary }}</p>
              <PhArrowUpRight :size="19" aria-hidden="true" />
            </NuxtLink>
          </nav>
        </aside>
      </div>
    </template>

    <div v-else class="seo-body">
      <div class="seo-article">
        <section v-for="section in page.sections" :key="section.title">
          <h2>{{ section.title }}</h2>
          <p v-for="paragraph in section.paragraphs" :key="paragraph">
            {{ paragraph }}
          </p>
          <ul v-if="section.points?.length">
            <li v-for="point in section.points" :key="point">{{ point }}</li>
          </ul>
        </section>

        <section v-if="page.searchExamples?.length" class="seo-examples">
          <h2>可以这样搜</h2>
          <p>这些写法可以直接搜索，也可以替换成你要找的作品名、年份或版本。</p>
          <ul aria-label="搜索词示例">
            <li v-for="example in page.searchExamples" :key="example">
              <button type="button" @click="runSearch(example)">{{ example }}</button>
            </li>
          </ul>
        </section>
      </div>

      <aside v-if="relatedPages.length" class="seo-related" aria-labelledby="related-title">
        <h2 id="related-title">继续查看</h2>
        <nav aria-label="相关页面">
          <NuxtLink v-for="item in relatedPages" :key="item.path" :to="item.path">
            <span>{{ item.title }}</span>
            <small>{{ item.eyebrow }}</small>
            <PhArrowRight :size="17" aria-hidden="true" />
          </NuxtLink>
        </nav>
      </aside>
    </div>

    <section
      v-if="page.faq?.length"
      class="geo-faq"
      aria-labelledby="geo-faq-title">
      <header>
        <h2 id="geo-faq-title">常见问题</h2>
        <p>根据本页主题整理，答案会随公开索引与链接状态更新。</p>
      </header>
      <div>
        <details v-for="item in page.faq" :key="item.question">
          <summary>
            <span>{{ item.question }}</span>
            <PhCaretDown :size="18" aria-hidden="true" />
          </summary>
          <p>{{ item.answer }}</p>
        </details>
      </div>
    </section>

    <aside
      v-if="page.references?.length"
      class="geo-references"
      aria-labelledby="geo-references-title">
      <div>
        <h2 id="geo-references-title">依据与更新说明</h2>
        <p>内容生成前会检索站内知识库，发布前还会检查重复度、关键词比例和无法证实的承诺。</p>
      </div>
      <ul>
        <li v-for="reference in page.references" :key="reference.id || reference.title">
          <a
            v-if="reference.url"
            :href="reference.url"
            rel="nofollow">
            {{ reference.title }}
          </a>
          <span v-else>{{ reference.title }}</span>
        </li>
      </ul>
    </aside>
  </article>
</template>

<script setup lang="ts">
import {
  PhArrowRight,
  PhArrowUpRight,
  PhCaretDown,
  PhCaretRight,
  PhMagnifyingGlass,
} from "@phosphor-icons/vue";
import {
  getSeoPage,
  type SeoPage,
} from "~/config/seoContent";

const props = defineProps<{ page: SeoPage }>();
const router = useRouter();
const runtimeConfig = useRuntimeConfig();
const siteUrl = ((runtimeConfig.public?.siteUrl as string) || "https://haosouku.com").replace(/\/$/, "");

const hubMeta = {
  pan: { path: "/pan", label: "网盘平台" },
  category: { path: "/category", label: "资源分类" },
  topic: { path: "/topic", label: "精选专题" },
  intent: { path: "/search", label: "组合搜索" },
  guide: { path: "/guide", label: "使用指南" },
  legal: { path: "/about", label: "网站说明" },
} as const;

const hubPath = computed(() => hubMeta[props.page.kind].path);
const hubLabel = computed(() => hubMeta[props.page.kind].label);
const isTopicPage = computed(() =>
  props.page.kind === "topic" || props.page.kind === "intent"
);
const isCinemaPage = computed(() => props.page.visualStyle === "cinema");
const isEditorialPage = computed(() => isTopicPage.value || isCinemaPage.value);
const keywordGroups = computed(() => props.page.keywordGroups || []);
const keywordCount = computed(() =>
  keywordGroups.value.reduce((total, group) => total + group.keywords.length, 0)
);
const relatedPages = computed(() =>
  props.page.related
    .map((path) => getSeoPage(path))
    .filter((page): page is SeoPage => Boolean(page))
);
const formattedUpdatedAt = computed(() => props.page.updatedAt.replace(/-/g, "."));
const canonical = `${siteUrl}${props.page.path}`;
const socialImage = props.page.heroImage
  ? `${siteUrl}${props.page.heroImage.fallback}`
  : `${siteUrl}/og.png`;
const schemaType = props.page.kind === "guide"
  ? "Article"
  : props.page.kind === "legal"
    ? "WebPage"
    : "CollectionPage";

useSeoMeta({
  title: props.page.seoTitle,
  description: props.page.description,
  robots: props.page.indexable ? "index,follow" : "noindex,follow",
  ogType: props.page.kind === "guide" ? "article" : "website",
  ogSiteName: "好搜库",
  ogTitle: props.page.seoTitle,
  ogDescription: props.page.description,
  ogUrl: canonical,
  ogImage: socialImage,
  ogImageAlt: props.page.heroImage?.alt || props.page.title,
  ogImageWidth: props.page.heroImage?.width || 1200,
  ogImageHeight: props.page.heroImage?.height || 630,
  twitterCard: "summary_large_image",
  twitterTitle: props.page.seoTitle,
  twitterDescription: props.page.description,
  twitterImage: socialImage,
  twitterImageAlt: props.page.heroImage?.alt || props.page.title,
});

useHead({
  link: [
    { rel: "canonical", href: canonical },
    ...(props.page.heroImage
      ? [{
          rel: "preload" as const,
          href: props.page.heroImage.src,
          as: "image" as const,
          type: "image/webp",
          fetchpriority: "high" as const,
        }]
      : []),
  ],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": schemaType,
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: props.page.seoTitle,
            headline: props.page.title,
            description: props.page.description,
            image: props.page.heroImage
              ? {
                  "@type": "ImageObject",
                  url: socialImage,
                  width: props.page.heroImage.width,
                  height: props.page.heroImage.height,
                  caption: props.page.heroImage.alt,
                }
              : socialImage,
            keywords: props.page.searchExamples?.join(", "),
            inLanguage: "zh-CN",
            datePublished: props.page.publishedAt || props.page.updatedAt,
            dateModified: props.page.updatedAt,
            mainEntityOfPage: canonical,
            author: { "@id": `${siteUrl}/#organization` },
            isPartOf: { "@id": `${siteUrl}/#website` },
            publisher: { "@id": `${siteUrl}/#organization` },
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
                name: hubLabel.value,
                item: `${siteUrl}${hubPath.value}`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: props.page.title,
                item: canonical,
              },
            ],
          },
          ...(props.page.faq?.length
            ? [{
                "@type": "FAQPage",
                "@id": `${canonical}#faq`,
                mainEntity: props.page.faq.map((item) => ({
                  "@type": "Question",
                  name: item.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: item.answer,
                  },
                })),
              }]
            : []),
        ],
      }).replace(/</g, "\\u003c"),
    },
  ],
});

function sectionId(index: number): string {
  return `section-${index + 1}`;
}

function sectionLayout(index: number): "lead" | "method" | "check" {
  if (index === 0) return "lead";
  if (index === 1) return "method";
  return "check";
}

function runSearch(keyword: string) {
  void router.push({ path: "/", query: { q: keyword } });
}
</script>

<style scoped>
.seo-page {
  width: 100%;
}

.breadcrumbs {
  display: flex;
  min-height: 28px;
  align-items: center;
  gap: 7px;
  margin-bottom: 36px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.breadcrumbs a {
  transition: color var(--transition-fast);
}

.breadcrumbs a:hover {
  color: var(--text-primary);
}

.breadcrumbs span {
  overflow: hidden;
  color: var(--text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seo-hero {
  display: grid;
  min-height: 390px;
  grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.55fr);
  align-items: end;
  gap: clamp(48px, 8vw, 112px);
  padding: 44px 0 64px;
  border-bottom: 1px solid var(--border-light);
}

.seo-hero__copy > p {
  margin: 0 0 16px;
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.08em;
}

.seo-hero h1 {
  max-width: 820px;
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(42px, 7vw, 76px);
  font-weight: 820;
  letter-spacing: -0.065em;
  line-height: 1.04;
  text-wrap: balance;
}

.seo-hero__copy > span {
  display: block;
  max-width: 690px;
  margin-top: 24px;
  color: var(--text-secondary);
  font-size: clamp(15px, 1.5vw, 18px);
  line-height: 1.8;
  text-wrap: pretty;
}

.seo-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  margin-top: 30px;
}

.seo-primary-action,
.seo-text-action {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  transition: transform var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
}

.seo-primary-action {
  border: 0;
  padding: 0 17px;
  border-radius: var(--radius-md);
  background: var(--primary);
  color: var(--text-on-primary);
  cursor: pointer;
}

.seo-primary-action:hover {
  background: var(--primary-strong);
}

.seo-text-action {
  color: var(--text-secondary);
}

.seo-text-action:hover {
  color: var(--text-primary);
}

.seo-primary-action:active,
.seo-text-action:active {
  transform: translateY(1px);
}

.seo-facts {
  margin: 0;
  padding: 0;
}

.seo-facts > div {
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr);
  gap: 16px;
  padding: 15px 0;
  border-bottom: 1px solid var(--border-light);
}

.seo-facts dt,
.seo-facts dd {
  margin: 0;
}

.seo-facts dt {
  color: var(--text-tertiary);
  font-size: 11px;
}

.seo-facts dd {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 650;
  text-align: right;
}

.seo-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px;
  gap: clamp(54px, 9vw, 128px);
  padding: 78px 0 42px;
}

.seo-article {
  max-width: 760px;
}

.seo-article section + section {
  margin-top: 62px;
}

.seo-article h2,
.seo-related h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(22px, 2.4vw, 30px);
  font-weight: 760;
  letter-spacing: -0.04em;
  text-wrap: balance;
}

.seo-article p {
  max-width: 65ch;
  margin: 20px 0 0;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 2;
  text-wrap: pretty;
}

.seo-article ul {
  display: grid;
  gap: 12px;
  margin: 22px 0 0;
  padding-left: 20px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.8;
}

.seo-examples button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  text-decoration-color: var(--border-strong);
  text-decoration-line: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  transition: color var(--transition-fast), text-decoration-color var(--transition-fast);
}

.seo-examples button:hover {
  color: var(--primary-strong);
  text-decoration-color: currentColor;
}

.seo-related {
  align-self: start;
  padding-top: 4px;
}

.seo-related h2 {
  font-size: 18px;
}

.seo-related nav {
  margin-top: 20px;
}

.seo-related a {
  display: grid;
  min-height: 72px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-content: center;
  gap: 5px 12px;
  padding: 13px 4px;
  border-bottom: 1px solid var(--border-light);
  transition: padding var(--transition-fast), color var(--transition-fast);
}

.seo-related a:hover {
  padding-left: 9px;
  color: var(--primary-strong);
}

.seo-related a span {
  font-size: 13px;
  font-weight: 680;
}

.seo-related a small {
  grid-column: 1;
  color: var(--text-tertiary);
  font-size: 11px;
}

.seo-related a svg {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
}

@media (max-width: 820px) {
  .seo-hero {
    min-height: auto;
    grid-template-columns: 1fr;
    gap: 44px;
    padding: 20px 0 48px;
  }

  .seo-body {
    grid-template-columns: 1fr;
    gap: 64px;
    padding-top: 58px;
  }

  .seo-related {
    max-width: 560px;
  }
}

@media (max-width: 520px) {
  .breadcrumbs {
    margin-bottom: 20px;
  }

  .seo-hero h1 {
    font-size: clamp(38px, 12vw, 52px);
  }

  .seo-hero__copy > span {
    font-size: 15px;
  }

  .seo-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .seo-primary-action,
  .seo-text-action {
    width: 100%;
  }

  .seo-article section + section {
    margin-top: 48px;
  }
}
</style>

<style scoped>
.seo-page--editorial {
  --editorial-surface: color-mix(in srgb, var(--bg-surface-subtle) 76%, var(--bg-body));
  --editorial-accent: color-mix(in srgb, var(--primary) 18%, var(--bg-surface));
}

.seo-page--editorial .breadcrumbs {
  margin-bottom: 24px;
}

.seo-hero--topic {
  min-height: min(510px, calc(100dvh - 176px));
  grid-template-columns: minmax(0, 0.86fr) minmax(420px, 1.14fr);
  align-items: center;
  gap: clamp(42px, 6vw, 78px);
  padding: 24px 0 56px;
}

.seo-hero--topic .seo-hero__copy {
  position: relative;
  z-index: 1;
}

.seo-hero--topic .seo-hero__copy > p,
.seo-hero--cinema .seo-hero__copy > p {
  margin-bottom: 18px;
}

.seo-page--editorial .seo-hero h1 {
  max-width: 760px;
  font-size: clamp(48px, 7vw, 80px);
  letter-spacing: -0.07em;
  line-height: 1.02;
}

.seo-hero--topic .seo-hero__copy > span {
  display: block;
  max-width: 42ch;
  margin-top: 22px;
  color: var(--text-secondary);
  font-size: clamp(15px, 1.45vw, 18px);
  line-height: 1.75;
  text-wrap: pretty;
}

.seo-hero--cinema {
  min-height: min(490px, calc(100dvh - 176px));
  grid-template-columns: minmax(0, 0.82fr) minmax(420px, 1.18fr);
  align-items: center;
  gap: clamp(42px, 6vw, 78px);
  padding: 24px 0 56px;
}

.seo-hero--cinema .seo-hero__copy {
  position: relative;
  z-index: 1;
}

.seo-hero--cinema .seo-hero__copy > span {
  max-width: 42ch;
  margin-top: 22px;
  line-height: 1.75;
}

.cinema-visual {
  position: relative;
  margin: 0;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-lg);
  background: #171a18;
  box-shadow:
    0 26px 70px color-mix(in srgb, var(--text-primary) 14%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--primary) 22%, transparent);
}

.cinema-visual::after {
  position: absolute;
  inset: 0;
  border: 1px solid color-mix(in srgb, var(--primary) 18%, rgba(255, 255, 255, 0.16));
  border-radius: inherit;
  content: "";
  pointer-events: none;
}

.cinema-visual picture,
.cinema-visual img {
  display: block;
  width: 100%;
  height: 100%;
}

.cinema-visual img {
  object-fit: cover;
  transition: transform var(--transition-slow), filter var(--transition-slow);
}

.seo-page--cinema .cinema-visual:hover img {
  filter: contrast(1.03);
  transform: scale(1.012);
}

.topic-visual {
  position: relative;
  margin: 0;
  overflow: hidden;
  aspect-ratio: 3 / 2;
  border-radius: var(--radius-lg);
  background: var(--bg-surface-subtle);
  box-shadow:
    0 24px 64px color-mix(in srgb, var(--text-primary) 11%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--primary) 15%, transparent);
}

.topic-visual::after {
  position: absolute;
  inset: 0;
  border: 1px solid color-mix(in srgb, var(--primary) 14%, rgba(255, 255, 255, 0.14));
  border-radius: inherit;
  content: "";
  pointer-events: none;
}

.topic-visual picture,
.topic-visual img {
  display: block;
  width: 100%;
  height: 100%;
}

.topic-visual img {
  object-fit: cover;
  transition: transform var(--transition-slow), filter var(--transition-slow);
}

.seo-hero--topic .topic-visual:hover img {
  filter: contrast(1.025) saturate(1.02);
  transform: scale(1.012);
}

.seo-facts--band {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
}

.seo-facts--band > div {
  display: block;
  min-height: 104px;
  padding: 24px 26px;
  border-bottom: 0;
  border-left: 1px solid var(--border-light);
}

.seo-facts--band > div:first-child {
  border-left: 0;
  padding-left: 0;
}

.seo-facts--band dt {
  margin-bottom: 11px;
  font-size: 11px;
  letter-spacing: 0.02em;
}

.seo-facts--band dd {
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
  text-wrap: pretty;
}

.editorial-nav {
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: 24px;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-light);
  scrollbar-width: none;
}

.editorial-nav::-webkit-scrollbar {
  display: none;
}

.editorial-nav span,
.editorial-nav a {
  flex: 0 0 auto;
  font-size: 12px;
  white-space: nowrap;
}

.editorial-nav span {
  color: var(--text-tertiary);
}

.editorial-nav a {
  color: var(--text-secondary);
  font-weight: 650;
  transition: color var(--transition-fast), transform var(--transition-fast);
}

.editorial-nav a:hover {
  color: var(--primary-strong);
  transform: translateY(-1px);
}

.editorial-body {
  padding: 76px 0 28px;
}

.editorial-article {
  max-width: 1040px;
  margin: 0 auto;
}

.editorial-section {
  scroll-margin-top: 104px;
}

.editorial-section + .editorial-section {
  margin-top: 76px;
}

.editorial-section--lead,
.editorial-section--check {
  display: grid;
  grid-template-columns: minmax(220px, 0.72fr) minmax(0, 1.28fr);
  gap: clamp(52px, 9vw, 124px);
  align-items: start;
}

.editorial-section--method {
  max-width: 900px;
  margin-right: 0;
  margin-left: auto;
  padding: clamp(34px, 5vw, 54px);
  border-radius: var(--radius-lg);
  background: var(--editorial-surface);
}

.editorial-section h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(28px, 3.5vw, 42px);
  font-weight: 780;
  letter-spacing: -0.052em;
  line-height: 1.15;
  text-wrap: balance;
}

.editorial-section--method h2 {
  max-width: 650px;
}

.editorial-section__copy {
  max-width: 66ch;
}

.editorial-section--method .editorial-section__copy {
  margin-top: 28px;
}

.editorial-section__copy p {
  margin: 0;
  color: var(--text-secondary);
  font-size: clamp(16px, 1.55vw, 18px);
  line-height: 2;
  text-wrap: pretty;
}

.editorial-section__copy p + p {
  margin-top: 20px;
}

.editorial-section__copy ul {
  display: grid;
  gap: 12px;
  margin: 24px 0 0;
  padding-left: 20px;
  color: var(--text-secondary);
  line-height: 1.85;
}

.editorial-examples {
  scroll-margin-top: 104px;
  margin-top: 96px;
  padding: clamp(36px, 5.5vw, 62px);
  border-radius: var(--radius-lg);
  background: var(--editorial-accent);
}

.editorial-examples > header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.62fr);
  gap: 48px;
  align-items: end;
}

.editorial-examples h2,
.editorial-related h2 {
  margin: 0;
  font-size: clamp(27px, 3.4vw, 40px);
  font-weight: 780;
  letter-spacing: -0.05em;
  line-height: 1.15;
  text-wrap: balance;
}

.editorial-examples > header p {
  max-width: 38ch;
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.8;
  text-wrap: pretty;
}

.editorial-examples ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 32px;
  margin: 34px 0 0;
  padding: 0;
  list-style: none;
}

.editorial-examples li {
  border-bottom: 1px solid color-mix(in srgb, var(--border-medium) 74%, transparent);
}

.editorial-examples button {
  display: grid;
  width: 100%;
  min-height: 62px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 670;
  text-align: left;
  transition: color var(--transition-fast), padding var(--transition-fast);
}

.editorial-examples button:hover {
  padding-right: 10px;
  padding-left: 10px;
  color: var(--primary-strong);
}

.editorial-examples button svg:first-child {
  color: var(--text-tertiary);
}

.keyword-library {
  scroll-margin-top: 104px;
  margin-top: 96px;
  padding-top: 36px;
  border-top: 1px solid var(--border-light);
}

.keyword-library > header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 32px;
}

.keyword-library > header p,
.keyword-library > header h2,
.keyword-library > header span {
  margin: 0;
}

.keyword-library > header p {
  margin-bottom: 10px;
  color: var(--primary-strong);
  font-size: 11px;
  font-weight: 720;
  letter-spacing: 0.06em;
}

.keyword-library > header h2 {
  color: var(--text-primary);
  font-size: clamp(27px, 3.4vw, 40px);
  font-weight: 780;
  letter-spacing: -0.05em;
  line-height: 1.15;
  text-wrap: balance;
}

.keyword-library > header > span {
  color: var(--text-tertiary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.keyword-library__groups {
  margin-top: 28px;
  border-top: 1px solid var(--border-light);
}

.keyword-library details {
  border-bottom: 1px solid var(--border-light);
}

.keyword-library summary {
  display: grid;
  min-height: 92px;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 20px;
  padding: 18px 4px;
  cursor: pointer;
  list-style: none;
  transition: color var(--transition-fast), padding var(--transition-fast);
}

.keyword-library summary::-webkit-details-marker {
  display: none;
}

.keyword-library summary:hover {
  padding-right: 10px;
  padding-left: 10px;
  color: var(--primary-strong);
}

.keyword-library summary:focus-visible {
  border-radius: var(--radius-sm);
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

.keyword-library summary > span:first-child {
  display: grid;
  gap: 7px;
}

.keyword-library summary strong {
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 730;
  letter-spacing: -0.025em;
}

.keyword-library summary small {
  max-width: 72ch;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.65;
}

.keyword-library__count {
  color: var(--text-tertiary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.keyword-library summary svg {
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
}

.keyword-library details[open] summary svg {
  transform: rotate(180deg);
}

.keyword-library nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 28px;
  padding: 0 4px 24px;
}

.keyword-library nav button {
  display: grid;
  width: 100%;
  min-height: 48px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 9px 2px;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border-light) 76%, transparent);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: color var(--transition-fast), padding var(--transition-fast);
}

.keyword-library nav button:hover {
  padding-right: 7px;
  padding-left: 7px;
  color: var(--primary-strong);
}

.editorial-related {
  margin-top: 96px;
  padding-top: 34px;
  border-top: 1px solid var(--border-light);
}

.editorial-related > header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 28px;
}

.editorial-related > header > a {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 680;
  white-space: nowrap;
  transition: color var(--transition-fast), transform var(--transition-fast);
}

.editorial-related > header > a:hover {
  color: var(--primary-strong);
  transform: translateX(2px);
}

.editorial-related nav {
  display: grid;
  grid-template-columns: 1.28fr 0.86fr 0.86fr;
  gap: 16px;
  margin-top: 28px;
}

.editorial-related nav > a {
  position: relative;
  min-height: 190px;
  padding: 26px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface-subtle);
  transition: background var(--transition-normal), transform var(--transition-normal);
}

.editorial-related nav > a:first-child {
  background: var(--editorial-accent);
}

.editorial-related nav > a:hover {
  background: var(--bg-hover);
  transform: translateY(-3px);
}

.editorial-related small,
.editorial-related strong,
.editorial-related p {
  display: block;
}

.editorial-related small {
  color: var(--text-tertiary);
  font-size: 11px;
}

.editorial-related strong {
  max-width: 86%;
  margin-top: 13px;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 730;
  line-height: 1.45;
  text-wrap: balance;
}

.editorial-related p {
  max-width: 42ch;
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.7;
  text-wrap: pretty;
}

.editorial-related nav svg {
  position: absolute;
  top: 25px;
  right: 24px;
  color: var(--text-tertiary);
}

@media (max-width: 900px) {
  .seo-hero--topic,
  .seo-hero--cinema {
    min-height: auto;
    grid-template-columns: 1fr;
    gap: 42px;
    padding: 22px 0 48px;
  }

  .cinema-visual,
  .topic-visual {
    max-width: 760px;
  }

  .seo-facts--band {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .seo-facts--band > div {
    min-height: 96px;
    border-bottom: 1px solid var(--border-light);
  }

  .seo-facts--band > div:nth-child(odd) {
    border-left: 0;
    padding-left: 0;
  }

  .seo-facts--band > div:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  .editorial-section--lead,
  .editorial-section--check {
    grid-template-columns: minmax(190px, 0.66fr) minmax(0, 1.34fr);
    gap: 48px;
  }

  .editorial-related nav {
    grid-template-columns: 1fr 1fr;
  }

  .editorial-related nav > a:first-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .seo-page--editorial .breadcrumbs {
    margin-bottom: 14px;
  }

  .seo-page--editorial .seo-hero h1 {
    font-size: clamp(40px, 12vw, 56px);
  }

  .seo-hero--topic,
  .seo-hero--cinema {
    gap: 34px;
    padding-top: 14px;
  }

  .seo-hero--cinema .seo-actions,
  .seo-hero--topic .seo-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .seo-hero--cinema .seo-primary-action,
  .seo-hero--cinema .seo-text-action,
  .seo-hero--topic .seo-primary-action,
  .seo-hero--topic .seo-text-action {
    width: 100%;
  }

  .cinema-visual {
    aspect-ratio: 4 / 3;
  }

  .cinema-visual img {
    object-position: 58% center;
  }

  .seo-facts--band > div {
    min-height: 90px;
    padding: 20px 16px;
  }

  .editorial-nav {
    width: calc(100% + 14px);
    gap: 20px;
    margin-right: -14px;
  }

  .editorial-body {
    padding-top: 54px;
  }

  .editorial-section + .editorial-section {
    margin-top: 58px;
  }

  .editorial-section--lead,
  .editorial-section--check {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .editorial-section--method {
    padding: 30px 24px 34px;
  }

  .editorial-section--method .editorial-section__copy {
    margin-top: 22px;
  }

  .editorial-section__copy p {
    font-size: 16px;
    line-height: 1.9;
  }

  .editorial-examples {
    margin-top: 70px;
    padding: 30px 22px 34px;
  }

  .editorial-examples > header {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .editorial-examples ul {
    grid-template-columns: 1fr;
    margin-top: 24px;
  }

  .keyword-library {
    margin-top: 72px;
  }

  .keyword-library > header {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .keyword-library summary {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
  }

  .keyword-library summary svg {
    display: none;
  }

  .keyword-library nav {
    grid-template-columns: 1fr;
  }

  .editorial-related {
    margin-top: 70px;
  }

  .editorial-related nav {
    grid-template-columns: 1fr;
  }

  .editorial-related nav > a:first-child {
    grid-column: auto;
  }

  .editorial-related nav > a {
    min-height: 174px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .seo-page--cinema .cinema-visual:hover img,
  .seo-hero--topic .topic-visual:hover img,
  .editorial-related nav > a:hover {
    transform: none;
  }
}

.geo-answer,
.geo-faq,
.geo-references {
  width: min(1180px, calc(100% - 48px));
  margin-inline: auto;
}

.geo-answer {
  display: grid;
  grid-template-columns: minmax(220px, 0.62fr) minmax(0, 1.38fr);
  gap: 48px;
  margin-top: 52px;
  padding: 34px 38px 38px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--brand, #72d83b) 10%, var(--surface, #f7f9f6));
}

.geo-answer > div > p {
  margin: 0 0 10px;
  color: var(--text-secondary, #5a6555);
  font-size: 13px;
  font-weight: 650;
}

.geo-answer h2,
.geo-faq h2,
.geo-references h2 {
  margin: 0;
  color: var(--text-primary, #172014);
  font-size: clamp(22px, 2.4vw, 34px);
  letter-spacing: -0.035em;
  line-height: 1.18;
}

.geo-answer > p {
  max-width: 68ch;
  margin: 0;
  color: var(--text-primary, #253022);
  font-size: 17px;
  line-height: 1.92;
}

.geo-faq {
  display: grid;
  grid-template-columns: minmax(220px, 0.65fr) minmax(0, 1.35fr);
  gap: 56px;
  margin-top: 88px;
}

.geo-faq header > p,
.geo-references > div > p {
  max-width: 44ch;
  margin: 14px 0 0;
  color: var(--text-secondary, #667061);
  line-height: 1.75;
}

.geo-faq details {
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #172014) 12%, transparent);
}

.geo-faq summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 0;
  color: var(--text-primary, #172014);
  font-size: 16px;
  font-weight: 650;
  cursor: pointer;
  list-style: none;
}

.geo-faq summary::-webkit-details-marker {
  display: none;
}

.geo-faq summary svg {
  flex: 0 0 auto;
  transition: transform 180ms ease;
}

.geo-faq details[open] summary svg {
  transform: rotate(180deg);
}

.geo-faq details > p {
  max-width: 68ch;
  margin: -2px 0 22px;
  color: var(--text-secondary, #586354);
  line-height: 1.85;
}

.geo-references {
  display: grid;
  grid-template-columns: minmax(220px, 0.85fr) minmax(0, 1.15fr);
  gap: 48px;
  margin-top: 88px;
  padding-top: 30px;
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #172014) 12%, transparent);
}

.geo-references h2 {
  font-size: 22px;
}

.geo-references ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.geo-references li {
  min-width: 0;
  color: var(--text-secondary, #586354);
  line-height: 1.55;
}

.geo-references a {
  color: var(--text-primary, #172014);
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}

@media (max-width: 767px) {
  .geo-answer,
  .geo-faq,
  .geo-references {
    width: min(100% - 32px, 1180px);
    grid-template-columns: 1fr;
  }

  .geo-answer {
    gap: 20px;
    margin-top: 34px;
    padding: 26px 22px 30px;
  }

  .geo-faq,
  .geo-references {
    gap: 28px;
    margin-top: 64px;
  }

  .geo-references ul {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .geo-faq summary svg {
    transition: none;
  }
}
</style>
