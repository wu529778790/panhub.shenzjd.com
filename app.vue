<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>

    <header class="site-header">
      <nav class="site-nav" aria-label="主导航">
        <NuxtLink
          to="/"
          class="brand"
          aria-label="好搜库首页"
          @click.prevent="handleHomeClick">
          <img
            class="brand-mark"
            src="/brand-mark.svg"
            alt=""
            aria-hidden="true"
            draggable="false" />
          <span class="brand-name">好搜库</span>
          <span class="brand-latin">HAOSOUKU</span>
        </NuxtLink>

        <div class="primary-links" aria-label="内容导航">
          <NuxtLink to="/pan">平台</NuxtLink>
          <NuxtLink to="/category">分类</NuxtLink>
          <NuxtLink to="/topic">专题</NuxtLink>
          <NuxtLink to="/guide">指南</NuxtLink>
        </div>

        <div class="nav-actions">
          <button
            class="favorite-button"
            type="button"
            aria-label="打开收藏"
            @click="favoritesOpen = true">
            <PhBookmarkSimple :size="18" weight="regular" aria-hidden="true" />
            <span>收藏</span>
            <strong v-if="favorites.length">{{ favorites.length }}</strong>
          </button>

          <ClientOnly>
            <button
              class="icon-button"
              type="button"
              @click="toggleDark"
              :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'"
              :title="isDark ? '亮色模式' : '暗色模式'">
              <PhSun v-if="isDark" :size="19" aria-hidden="true" />
              <PhMoon v-else :size="19" aria-hidden="true" />
            </button>
          </ClientOnly>

          <button
            v-if="!isHomeRoute"
            class="icon-button"
            type="button"
            @click="settingsOpen = true"
            aria-label="打开搜索设置"
            title="搜索设置">
            <PhGearSix :size="20" aria-hidden="true" />
          </button>
        </div>
      </nav>
    </header>

    <main id="main-content" class="site-main">
      <NuxtPage />
    </main>

    <footer class="site-footer">
      <div class="footer-brand">
        <img
          class="brand-mark brand-mark--small"
          src="/brand-mark.svg"
          alt=""
          aria-hidden="true"
          draggable="false" />
        <p><strong>好搜库</strong><span>让分散的资源更容易找到</span></p>
      </div>
      <nav class="footer-links" aria-label="页脚导航">
        <NuxtLink to="/about">关于</NuxtLink>
        <NuxtLink to="/copyright">版权下架</NuxtLink>
        <NuxtLink to="/privacy">隐私</NuxtLink>
        <NuxtLink to="/terms">条款</NuxtLink>
      </nav>
      <p class="footer-note">搜索结果来自公开索引，请遵守来源网站规则。</p>
    </footer>

    <ClientOnly>
      <SettingsDrawer
        v-model="settings"
        v-model:open="settingsOpen"
        :all-plugins="ALL_PLUGIN_NAMES"
        :all-tg-channels="allTgChannels"
        @save="saveSettings"
        @reset-default="resetToDefault" />
      <FavoritesDrawer v-model:open="favoritesOpen" />
    </ClientOnly>

    <div v-if="toast.show" class="toast" :class="toast.type" role="status" aria-live="polite">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  PhBookmarkSimple,
  PhGearSix,
  PhMoon,
  PhSun,
} from "@phosphor-icons/vue";
import { ALL_PLUGIN_NAMES } from "./config/plugins";
import channelsConfig from "~/config/channels.json";

const publicConfig = useRuntimeConfig().public;
const verificationMeta = [
  { name: "google-site-verification", content: String(publicConfig.googleSiteVerification || "") },
  { name: "msvalidate.01", content: String(publicConfig.bingSiteVerification || "") },
].filter((entry) => entry.content);

useHead({
  meta: verificationMeta,
  script: [
    {
      innerHTML: `(function(){var s=localStorage.getItem('panhub:dark-mode');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')})();`,
    },
  ],
});

const { settings, loadSettings, saveSettings, resetToDefault } = useSettings();
const { toast, showToast } = useToast();
const { isDark, toggle: toggleDark, init: initDarkMode } = useDarkMode();
const { favorites, load: loadFavorites } = useFavorites();
const { trackLanding } = useSeoAttribution();
const { start: startTrafficAnalytics } = useTrafficAnalytics();
const settingsOpen = ref(false);
const favoritesOpen = ref(false);
const route = useRoute();
const requestUrl = useRequestURL();
const isHomeRoute = computed(() =>
  (import.meta.server ? requestUrl.pathname : route.path) === "/"
);
const homeResetRequest = useState<number>("home-reset-request", () => 0);

const allTgChannels = computed(() => {
  const configured = (publicConfig as any)?.tgDefaultChannels;
  return Array.isArray(configured) && configured.length > 0
    ? configured
    : channelsConfig.defaultChannels;
});

async function handleHomeClick() {
  if (route.path === "/") homeResetRequest.value += 1;
  else await navigateTo("/");

  await nextTick();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
}

watch(
  () => settings.value,
  (next, previous) => {
    if (previous && JSON.stringify(next) !== JSON.stringify(previous)) {
      showToast("设置已保存", "success");
    }
  },
  { deep: true }
);

onMounted(() => {
  initDarkMode();
  loadSettings();
  loadFavorites();
  trackLanding();
  startTrafficAnalytics();
});
</script>

<style>
@import "~/assets/css/global.css";
</style>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
}

.skip-link {
  position: fixed;
  top: 8px;
  left: 16px;
  z-index: 60;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--text-primary);
  color: var(--bg-body);
  transform: translateY(-140%);
  transition: transform var(--transition-fast);
}

.skip-link:focus { transform: translateY(0); }

.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid color-mix(in srgb, var(--border-light) 86%, transparent);
  background: var(--bg-glass);
  backdrop-filter: blur(18px) saturate(130%);
  -webkit-backdrop-filter: blur(18px) saturate(130%);
}

.site-nav {
  display: grid;
  width: min(100% - 40px, 1200px);
  height: 68px;
  margin: 0 auto;
  grid-template-columns: minmax(210px, 1fr) auto minmax(210px, 1fr);
  align-items: center;
  gap: 20px;
}

.brand {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  display: block;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border-radius: 10px;
  object-fit: contain;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.44);
  user-select: none;
}

.brand-name {
  font-size: 18px;
  font-weight: 820;
  letter-spacing: -0.045em;
}

.brand-latin {
  margin-left: 4px;
  padding-left: 14px;
  border-left: 1px solid var(--border-medium);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 720;
  letter-spacing: 0.12em;
}

.primary-links {
  display: flex;
  height: 100%;
  align-items: center;
  gap: 4px;
}

.primary-links a {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  padding: 0 11px;
  border-radius: 9px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.primary-links a:hover,
.primary-links a.router-link-active {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.icon-button,
.favorite-button {
  display: inline-flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-btn);
  color: var(--text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.icon-button { width: 40px; padding: 0; }
.favorite-button { gap: 7px; padding: 0 12px; font-size: 13px; font-weight: 650; }
.favorite-button strong { color: var(--primary-strong); font-variant-numeric: tabular-nums; }

.icon-button:hover,
.favorite-button:hover {
  border-color: var(--border-medium);
  background: var(--bg-btn-hover);
  color: var(--text-primary);
}

.site-main {
  width: min(100% - 40px, 1200px);
  flex: 1;
  margin: 0 auto;
  padding: 38px 0 72px;
}

.site-footer {
  display: grid;
  width: min(100% - 40px, 1200px);
  min-height: 92px;
  margin: 0 auto;
  grid-template-columns: minmax(210px, 1fr) auto minmax(240px, 1fr);
  align-items: center;
  gap: 24px;
  border-top: 1px solid var(--border-light);
  color: var(--text-tertiary);
  font-size: 12px;
}

.footer-brand { display: flex; align-items: center; gap: 11px; }
.brand-mark--small { width: 30px; height: 30px; border-radius: 8px; }
.site-footer p { margin: 0; }
.site-footer strong,
.site-footer span { display: block; }
.site-footer strong { color: var(--text-primary); font-size: 13px; }

.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.footer-links a {
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.footer-links a:hover {
  color: var(--text-primary);
}

.footer-note {
  text-align: right;
}

.toast {
  position: fixed;
  top: 82px;
  right: 24px;
  z-index: 70;
  padding: 11px 16px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-lg);
  color: var(--text-primary);
  font-size: 13px;
}

.toast.success { border-color: color-mix(in srgb, var(--success) 48%, var(--border-light)); }
.toast.error { border-color: color-mix(in srgb, var(--error) 48%, var(--border-light)); }

@media (max-width: 640px) {
  .site-nav,
  .site-main,
  .site-footer { width: min(100% - 28px, 1200px); }
  .site-main { padding-top: 26px; }
  .brand-latin { display: none; }
  .primary-links { display: none; }
  .site-nav { grid-template-columns: minmax(0, 1fr) auto; }
  .favorite-button span { display: none; }
  .favorite-button { width: 40px; padding: 0; }
  .site-footer {
    grid-template-columns: 1fr;
    padding: 24px 0;
    align-items: flex-start;
    gap: 18px;
  }
  .footer-links { justify-content: flex-start; flex-wrap: wrap; gap: 12px 18px; }
  .footer-note { text-align: left; }
  .toast { right: 14px; left: 14px; }
}

@media (min-width: 641px) and (max-width: 920px) {
  .site-nav { grid-template-columns: minmax(180px, 1fr) auto minmax(150px, 1fr); }
  .brand-latin { display: none; }
  .primary-links a { padding: 0 8px; }
  .favorite-button span { display: none; }
  .favorite-button { width: 40px; padding: 0; }
  .site-footer { grid-template-columns: minmax(180px, 1fr) auto; }
  .footer-note { display: none; }
}
</style>
