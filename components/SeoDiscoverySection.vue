<template>
  <section class="discovery" aria-labelledby="discovery-title">
    <header class="discovery__header">
      <div>
        <p>浏览入口</p>
        <h2 id="discovery-title">先选范围，再开始搜索</h2>
      </div>
      <NuxtLink to="/guide/search-tips">
        搜索技巧
        <PhArrowRight :size="17" aria-hidden="true" />
      </NuxtLink>
    </header>

    <div class="discovery__layout">
      <section class="discovery__platforms" aria-labelledby="platform-title">
        <header>
          <h3 id="platform-title">按网盘平台</h3>
          <NuxtLink to="/pan">全部平台</NuxtLink>
        </header>
        <nav aria-label="网盘平台入口">
          <NuxtLink v-for="page in discoveryPlatforms" :key="page.path" :to="page.path">
            <img :src="platformIcon(page.slug)" alt="" width="32" height="32" loading="lazy" />
            <span>
              <strong>{{ page.title }}</strong>
              <small>{{ page.summary }}</small>
            </span>
            <PhArrowUpRight :size="18" aria-hidden="true" />
          </NuxtLink>
        </nav>
      </section>

      <div class="discovery__secondary">
        <section aria-labelledby="category-title">
          <header>
            <h3 id="category-title">常用分类</h3>
            <NuxtLink to="/category">全部分类</NuxtLink>
          </header>
          <nav class="discovery__compact" aria-label="资源分类入口">
            <NuxtLink v-for="page in discoveryCategories" :key="page.path" :to="page.path">
              {{ page.title }}
              <PhArrowRight :size="15" aria-hidden="true" />
            </NuxtLink>
          </nav>
        </section>

        <section aria-labelledby="topic-title">
          <header>
            <h3 id="topic-title">精选专题</h3>
            <NuxtLink to="/topic">全部专题</NuxtLink>
          </header>
          <nav class="discovery__compact" aria-label="精选专题入口">
            <NuxtLink v-for="page in discoveryTopics" :key="page.path" :to="page.path">
              {{ page.title }}
              <PhArrowRight :size="15" aria-hidden="true" />
            </NuxtLink>
          </nav>
        </section>

        <section aria-labelledby="intent-title">
          <header>
            <h3 id="intent-title">平台与内容组合</h3>
            <NuxtLink to="/search">全部组合</NuxtLink>
          </header>
          <nav class="discovery__compact" aria-label="组合搜索入口">
            <NuxtLink v-for="page in discoveryIntents" :key="page.path" :to="page.path">
              {{ page.title }}
              <PhArrowRight :size="15" aria-hidden="true" />
            </NuxtLink>
          </nav>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  PhArrowRight,
  PhArrowUpRight,
} from "@phosphor-icons/vue";
import {
  discoveryCategories,
  discoveryIntents,
  discoveryPlatforms,
  discoveryTopics,
} from "~/config/seoDiscovery";
import { PLATFORM_INFO } from "~/config/plugins";

function platformIcon(slug: string): string {
  return PLATFORM_INFO[slug]?.icon || "/brand-mark.svg";
}

</script>

<style scoped>
.discovery {
  margin-top: 88px;
  padding-top: 68px;
  border-top: 1px solid var(--border-light);
}

.discovery__header,
.discovery__platforms > header,
.discovery__secondary section > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
}

.discovery__header {
  margin-bottom: 44px;
}

.discovery__header p {
  margin: 0 0 10px;
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.08em;
}

.discovery__header h2 {
  margin: 0;
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 790;
  letter-spacing: -0.055em;
  text-wrap: balance;
}

.discovery__header > a,
.discovery__platforms header a,
.discovery__secondary header a {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 680;
  white-space: nowrap;
  transition: color var(--transition-fast);
}

.discovery__header > a:hover,
.discovery__platforms header a:hover,
.discovery__secondary header a:hover {
  color: var(--primary-strong);
}

.discovery__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
  gap: clamp(48px, 8vw, 104px);
}

.discovery h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 720;
  letter-spacing: -0.025em;
}

.discovery__platforms nav {
  margin-top: 18px;
}

.discovery__platforms nav a {
  display: grid;
  min-height: 82px;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 15px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--border-light);
  transition: padding var(--transition-fast), color var(--transition-fast);
}

.discovery__platforms nav a:hover {
  padding-left: 10px;
  color: var(--primary-strong);
}

.discovery__platforms img {
  display: block;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  object-fit: cover;
}

.discovery__platforms nav span {
  display: grid;
  gap: 5px;
}

.discovery__platforms strong {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 690;
}

.discovery__platforms small {
  display: -webkit-box;
  overflow: hidden;
  max-width: 68ch;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.discovery__secondary {
  display: grid;
  align-content: start;
  gap: 56px;
}

.discovery__compact {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 20px;
}

.discovery__compact a {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  background: var(--bg-surface-subtle);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 620;
  transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
}

.discovery__compact a:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.discovery__compact a:active {
  transform: translateY(1px);
}

@media (max-width: 820px) {
  .discovery {
    margin-top: 64px;
    padding-top: 54px;
  }

  .discovery__layout {
    grid-template-columns: 1fr;
    gap: 58px;
  }
}

@media (max-width: 520px) {
  .discovery__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }

  .discovery__platforms small {
    -webkit-line-clamp: 2;
  }

  .discovery__compact {
    grid-template-columns: 1fr;
  }
}
</style>
