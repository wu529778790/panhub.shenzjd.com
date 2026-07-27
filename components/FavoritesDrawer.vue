<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-layer" @click.self="$emit('update:open', false)">
        <aside class="favorites-drawer" aria-labelledby="favorites-title">
          <header class="drawer-header">
            <div>
              <h2 id="favorites-title">我的收藏</h2>
              <p>{{ favorites.length }} 条资源</p>
            </div>
            <button type="button" aria-label="关闭收藏" @click="$emit('update:open', false)">
              <PhX :size="20" aria-hidden="true" />
            </button>
          </header>

          <section class="sync-panel" aria-labelledby="sync-title">
            <div class="sync-heading">
              <div>
                <h3 id="sync-title">跨设备同步</h3>
                <p>D1 只保存加密数据，无法读取收藏内容。</p>
              </div>
              <PhCloudCheck v-if="syncKey" :size="22" aria-hidden="true" />
            </div>

            <template v-if="syncKey">
              <label for="favorite-sync-key">同步码</label>
              <div class="sync-code">
                <input id="favorite-sync-key" :value="syncKey" readonly />
                <button type="button" @click="copySyncKey">复制</button>
              </div>
              <div class="sync-actions">
                <button type="button" :disabled="syncing" @click="syncNow">
                  <PhArrowsClockwise :size="16" aria-hidden="true" />
                  {{ syncing ? "同步中" : "立即同步" }}
                </button>
                <button type="button" class="text-button" @click="disconnectSync">停用同步</button>
              </div>
            </template>

            <template v-else>
              <button class="create-sync" type="button" :disabled="syncing" @click="createSync">
                创建同步码
              </button>
              <div class="connect-existing">
                <label for="existing-sync-key">已有同步码</label>
                <div>
                  <input
                    id="existing-sync-key"
                    v-model="inputKey"
                    autocomplete="off"
                    placeholder="输入另一台设备的同步码" />
                  <button type="button" :disabled="!inputKey.trim() || syncing" @click="connectExisting">
                    连接
                  </button>
                </div>
              </div>
            </template>

            <p v-if="syncError || localError" class="sync-error" role="alert">
              {{ localError || syncError }}
            </p>
            <p v-else-if="lastSyncedAt" class="sync-status">
              最近同步 {{ new Date(lastSyncedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) }}
            </p>
            <p class="sync-warning">
              同步码无法找回。丢失后不能在新设备恢复收藏，请保存到安全位置。
            </p>
          </section>

          <div v-if="favorites.length" class="favorite-list">
            <article
              v-for="item in favorites"
              :key="item.url"
              class="favorite-item"
              :class="{ 'favorite-item--dead': favoriteStatus(item.url) === 'dead' }">
              <div>
                <span>
                  {{ platformName(item.platform) }}
                  <b v-if="favoriteStatusLabel(item.url)">{{ favoriteStatusLabel(item.url) }}</b>
                </span>
                <a :href="item.url" target="_blank" rel="noopener noreferrer nofollow">
                  {{ item.title }}
                </a>
              </div>
              <button type="button" aria-label="删除收藏" @click="removeFavorite(item.url)">
                <PhTrash :size="17" aria-hidden="true" />
              </button>
            </article>
          </div>

          <div v-else class="favorite-empty">
            <PhBookmarkSimple :size="32" aria-hidden="true" />
            <h3>还没有收藏</h3>
            <p>搜索后点击书签按钮，资源会出现在这里。</p>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  PhArrowsClockwise,
  PhBookmarkSimple,
  PhCloudCheck,
  PhTrash,
  PhX,
} from "@phosphor-icons/vue";
import { PLATFORM_INFO } from "~/config/plugins";

const props = defineProps<{ open: boolean }>();
defineEmits<{ "update:open": [value: boolean] }>();

const {
  favorites,
  syncKey,
  syncing,
  syncError,
  lastSyncedAt,
  removeFavorite,
  syncNow,
  createSyncKey,
  connectSyncKey,
  disconnectSync,
} = useFavorites();
const { get: getLinkHealth, load: loadLinkHealth } = useLinkHealth();
const inputKey = ref("");
const localError = ref("");

function platformName(type: string) {
  return PLATFORM_INFO[type]?.name || type || "其他";
}

function favoriteStatus(url: string) {
  return getLinkHealth(url)?.status || "unknown";
}

function favoriteStatusLabel(url: string) {
  switch (favoriteStatus(url)) {
    case "dead": return "已失效";
    case "suspect": return "待复核";
    case "alive": return "可用";
    case "password": return "需提取码";
    default: return "";
  }
}

async function createSync() {
  localError.value = "";
  try {
    await createSyncKey();
  } catch (cause: any) {
    localError.value = cause?.message || "无法创建同步码";
  }
}

async function connectExisting() {
  localError.value = "";
  try {
    await connectSyncKey(inputKey.value);
    inputKey.value = "";
  } catch (cause: any) {
    localError.value = cause?.message || "无法连接同步码";
  }
}

async function copySyncKey() {
  await navigator.clipboard.writeText(syncKey.value);
}

watch(
  [() => props.open, () => favorites.value.map((item) => item.url).join("\n")],
  ([open]) => {
    if (open) void loadLinkHealth(favorites.value.map((item) => item.url));
  },
  { immediate: true }
);
</script>

<style scoped>
.drawer-layer {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  justify-content: flex-end;
  background: rgba(11, 16, 12, 0.42);
}

.favorites-drawer {
  width: min(100%, 460px);
  height: 100dvh;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg-body);
  box-shadow: var(--shadow-xl);
}

.drawer-header,
.sync-heading,
.sync-actions,
.favorite-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.drawer-header h2,
.sync-panel h3,
.favorite-empty h3 {
  margin: 0;
  color: var(--text-primary);
}

.drawer-header h2 { font-size: 23px; letter-spacing: -0.04em; }
.drawer-header p,
.sync-panel p,
.favorite-empty p { margin: 4px 0 0; color: var(--text-tertiary); font-size: 12px; line-height: 1.55; }

.drawer-header > button,
.favorite-item > button {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-btn);
}

.sync-panel {
  margin-top: 24px;
  padding: 18px;
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
}

.sync-heading { align-items: flex-start; margin-bottom: 16px; }
.sync-heading h3 { font-size: 15px; }
.sync-heading svg { color: var(--primary-strong); }

.sync-panel label {
  display: block;
  margin-bottom: 7px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.sync-code,
.connect-existing > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.sync-panel input {
  width: 100%;
  min-width: 0;
  height: 42px;
  padding: 0 11px;
  border: 1px solid var(--border-medium);
  border-radius: 9px;
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 12px;
}

.sync-panel button {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--border-medium);
  border-radius: 9px;
  background: var(--bg-btn);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
}

.sync-panel button:hover:not(:disabled) { background: var(--bg-btn-hover); }
.create-sync { width: 100%; background: var(--primary) !important; color: var(--primary-ink) !important; border-color: transparent !important; }
.connect-existing { margin-top: 16px; }
.sync-actions { margin-top: 10px; }
.sync-actions button { display: inline-flex; align-items: center; gap: 6px; }
.sync-actions .text-button { border: 0; background: transparent; color: var(--text-secondary); }
.sync-error { color: var(--error) !important; }
.sync-warning { color: var(--text-secondary) !important; }
.sync-status { color: var(--success) !important; }

.favorite-list { margin-top: 22px; }
.favorite-item { padding: 16px 2px; align-items: flex-start; }
.favorite-item + .favorite-item { border-top: 1px solid var(--border-light); }
.favorite-item > div { min-width: 0; }
.favorite-item span { display: block; margin-bottom: 5px; color: var(--text-tertiary); font-size: 11px; }
.favorite-item span b {
  margin-left: 7px;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
}
.favorite-item--dead { opacity: 0.65; }
.favorite-item--dead span b { color: var(--error); }
.favorite-item--dead a { text-decoration: line-through; }
.favorite-item a { display: block; color: var(--text-primary); font-size: 13px; font-weight: 650; line-height: 1.5; overflow-wrap: anywhere; }
.favorite-item > button:hover { color: var(--error); }

.favorite-empty { padding: 70px 20px; text-align: center; color: var(--text-tertiary); }
.favorite-empty h3 { margin-top: 14px; font-size: 17px; }

.drawer-enter-active,
.drawer-leave-active { transition: opacity var(--transition-normal); }
.drawer-enter-active .favorites-drawer,
.drawer-leave-active .favorites-drawer { transition: transform var(--transition-normal); }
.drawer-enter-from,
.drawer-leave-to { opacity: 0; }
.drawer-enter-from .favorites-drawer,
.drawer-leave-to .favorites-drawer { transform: translateX(100%); }

@media (max-width: 520px) {
  .favorites-drawer { padding: 20px 16px; }
}
</style>
