<template>
  <div
    v-if="open"
    class="drawer-mask"
    @click.self="
      () => {
        emitSave();
        $emit('update:open', false);
      }
    ">
    <div class="drawer" role="dialog" aria-modal="true" aria-label="搜索设置">
      <header class="drawer__header">
        <div>
          <strong>搜索设置</strong>
          <p class="header-subtitle">修改后自动保存</p>
        </div>
        <button
          class="btn btn--close"
          type="button"
          aria-label="关闭设置"
          @click="
            () => {
              emitSave();
              $emit('update:open', false);
            }
          ">
          关闭
        </button>
      </header>

      <div class="drawer-body">
        <aside class="drawer-nav">
          <button
            type="button"
            class="nav-link"
            :class="{ active: activeSection === 'plugins' }"
            @click="onNavClick('settings-plugins', 'plugins')">
            插件来源
          </button>
          <button
            type="button"
            class="nav-link"
            :class="{ active: activeSection === 'channels' }"
            @click="onNavClick('settings-channels', 'channels')">
            频道来源
          </button>
          <button
            type="button"
            class="nav-link"
            :class="{ active: activeSection === 'performance' }"
            @click="onNavClick('settings-performance', 'performance')">
            性能并发
          </button>
        </aside>

        <div ref="drawerMainRef" class="drawer-main" @scroll="onDrawerScroll">
          <section id="settings-plugins" class="drawer__section">
            <div class="section__title">
              <strong>插件来源</strong>
              <div class="section__tools">
                <button class="btn" type="button" @click="onSelectAll">全选</button>
                <button class="btn" type="button" @click="onClearAll">全不选</button>
              </div>
            </div>
            <div class="plugin-grid">
              <label v-for="name in allPlugins" :key="name" class="plugin-item">
                <input
                  type="checkbox"
                  :value="name"
                  v-model="inner.enabledPlugins"
                  @change="saveTemp" />
                <span>{{ name }}</span>
              </label>
            </div>
          </section>

          <section id="settings-channels" class="drawer__section">
            <div class="section__title">
              <strong>频道来源</strong>
              <div class="section__tools">
                <button class="btn" type="button" @click="onSelectAllTg">全选</button>
                <button class="btn" type="button" @click="onClearAllTg">全不选</button>
              </div>
            </div>
            <div class="plugin-grid">
              <label v-for="name in allTgChannels" :key="name" class="plugin-item">
                <input
                  type="checkbox"
                  :value="name"
                  v-model="inner.enabledTgChannels"
                  @change="saveTemp" />
                <span>{{ name }}</span>
              </label>
            </div>
          </section>

          <section id="settings-performance" class="drawer__section">
            <div class="section__title"><strong>性能与并发</strong></div>

            <div class="field">
              <label class="label" for="concurrency-input">插件并发数</label>
              <input
                id="concurrency-input"
                type="number"
                min="1"
                max="16"
                v-model.number="inner.concurrency"
                @change="saveTemp"
                class="input"
                :placeholder="String(DEFAULT_CONCURRENCY)"
                :title="`默认 ${DEFAULT_CONCURRENCY}，范围 1-16`" />
              <span class="hint">默认 {{ DEFAULT_CONCURRENCY }}，范围 1-16</span>
            </div>

            <div class="field">
              <label class="label" for="timeout-input">插件超时(ms)</label>
              <input
                id="timeout-input"
                type="number"
                min="1000"
                step="500"
                v-model.number="inner.pluginTimeoutMs"
                @change="saveTemp"
                class="input"
                :placeholder="String(DEFAULT_PLUGIN_TIMEOUT)"
                :title="`默认 ${DEFAULT_PLUGIN_TIMEOUT} ms`" />
              <span class="hint">默认 {{ DEFAULT_PLUGIN_TIMEOUT }} ms</span>
            </div>
          </section>
        </div>
      </div>

      <footer class="drawer__footer">
        <button class="btn btn--subtle" type="button" @click="$emit('reset-default')">恢复默认</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
interface UserSettings {
  enabledTgChannels: string[];
  enabledPlugins: string[];
  concurrency: number;
  pluginTimeoutMs: number;
}
const props = defineProps<{
  modelValue: UserSettings;
  open: boolean;
  allPlugins: string[];
  allTgChannels: string[];
}>();
const emit = defineEmits([
  "update:modelValue",
  "update:open",
  "save",
  "reset-default",
]);

const inner = ref<UserSettings>({
  enabledTgChannels: [],
  enabledPlugins: [],
  concurrency: 4,
  pluginTimeoutMs: 5000,
});

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_PLUGIN_TIMEOUT = 5000;
const drawerMainRef = ref<HTMLElement | null>(null);
const activeSection = ref<"plugins" | "channels" | "performance">("plugins");

watch(
  () => props.modelValue,
  (v) => {
    if (!v) return;
    inner.value = JSON.parse(JSON.stringify(v));
  },
  { immediate: true }
);

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    setActiveSectionByScroll();
  }
);

function saveTemp() {
  emit("update:modelValue", inner.value);
  emit("save");
}
function emitSave() {
  emit("update:modelValue", inner.value);
  emit("save");
}
function onSelectAll() {
  inner.value.enabledPlugins = [...props.allPlugins];
  saveTemp();
}
function onClearAll() {
  inner.value.enabledPlugins = [];
  saveTemp();
}

function onSelectAllTg() {
  inner.value.enabledTgChannels = [...props.allTgChannels];
  saveTemp();
}
function onClearAllTg() {
  inner.value.enabledTgChannels = [];
  saveTemp();
}

function onNavClick(
  id: "settings-plugins" | "settings-channels" | "settings-performance",
  key: "plugins" | "channels" | "performance"
) {
  activeSection.value = key;
  const root = drawerMainRef.value;
  const el = root?.querySelector<HTMLElement>(`#${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setActiveSectionByScroll() {
  const root = drawerMainRef.value;
  if (!root) return;
  const ids = [
    { id: "settings-plugins", key: "plugins" as const },
    { id: "settings-channels", key: "channels" as const },
    { id: "settings-performance", key: "performance" as const },
  ];
  const threshold = root.scrollTop + 24;
  let current = ids[0].key;

  for (const item of ids) {
    const el = root.querySelector<HTMLElement>(`#${item.id}`);
    if (!el) continue;
    if (el.offsetTop <= threshold) current = item.key;
  }
  activeSection.value = current;
}

function onDrawerScroll() {
  setActiveSectionByScroll();
}
</script>

<style scoped>
.drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(3px);
  display: flex;
  justify-content: flex-end;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.drawer {
  width: min(460px, 92vw);
  height: 100vh;
  background: rgba(255, 253, 248, 0.96);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.2);
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overscroll-behavior: contain;
  border-left: 1px solid var(--border-medium);
  animation: slideInRight 0.3s ease;
}

.drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.drawer__header strong {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-primary);
}

.header-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

.drawer-body {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 10px;
  min-height: 0;
  flex: 1;
}

.drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: sticky;
  top: 0;
  height: fit-content;
}

.nav-link {
  display: block;
  padding: 8px 6px;
  border-radius: 9px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.4);
  color: var(--text-secondary);
  font-size: 11px;
  text-align: center;
  font-weight: 700;
  cursor: pointer;
}

.nav-link:hover {
  border-color: var(--border-medium);
  color: var(--primary-dark);
}

.nav-link.active {
  border-color: rgba(15, 118, 110, 0.45);
  background: rgba(15, 118, 110, 0.14);
  color: var(--primary-dark);
}

.drawer-main {
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  padding-right: 2px;
}

.drawer__section {
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(212, 199, 171, 0.6);
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 10px;
}

.section__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section__title strong {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.section__tools {
  display: flex;
  gap: 6px;
}

.plugin-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

@media (min-width: 820px) {
  .plugin-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.plugin-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 999px;
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    transform var(--transition-fast);
  min-width: 0;
}

.plugin-item:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
  transform: translateY(-1px);
}

.plugin-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  min-width: 16px;
  min-height: 16px;
  max-width: 16px;
  max-height: 16px;
  margin: 0;
  flex: 0 0 16px;
  cursor: pointer;
  accent-color: var(--primary);
}

.plugin-item span {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-secondary);
}

.field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 10px;
}

.label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 700;
}

.input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  border-radius: 10px;
  font-size: 12px;
  color: var(--text-primary);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast),
    background-color var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
}

.input::placeholder {
  color: var(--text-tertiary);
}

.hint {
  font-size: 11px;
  color: var(--text-tertiary);
}

.btn {
  padding: 7px 10px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 9px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    color var(--transition-fast), transform var(--transition-fast),
    box-shadow var(--transition-fast);
  white-space: nowrap;
}

.btn:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

.btn--close {
  min-width: 56px;
}

.btn--subtle {
  color: var(--text-secondary);
  border-color: var(--border-medium);
  background: rgba(255, 255, 255, 0.55);
}

.btn--subtle:hover {
  color: var(--text-primary);
  border-color: var(--primary);
  background: rgba(15, 118, 110, 0.08);
}

.drawer__footer {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}

@media (max-width: 640px) {
  .drawer {
    width: 100vw;
    padding: 14px;
  }

  .drawer-body {
    grid-template-columns: 1fr;
  }

  .drawer-nav {
    position: static;
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .nav-link {
    white-space: nowrap;
    min-width: 84px;
  }

  .plugin-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .drawer__footer {
    justify-content: center;
  }
}

@media (prefers-color-scheme: dark) {
  .drawer-mask {
    background: rgba(0, 0, 0, 0.6);
  }

  .drawer {
    background: rgba(13, 17, 23, 0.96);
    border-left-color: var(--border-light);
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
  }

  .drawer__header {
    border-bottom-color: var(--border-light);
  }

  .drawer__header strong {
    color: var(--text-primary);
  }

  .header-subtitle {
    color: var(--text-tertiary);
  }

  .nav-link {
    background: var(--bg-secondary);
    border-color: var(--border-light);
    color: var(--text-secondary);
  }

  .nav-link:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--border-medium);
    color: var(--text-primary);
  }

  .nav-link.active {
    border-color: rgba(45, 212, 191, 0.35);
    background: rgba(13, 148, 136, 0.15);
    color: var(--primary);
  }

  .drawer__section {
    background: rgba(22, 27, 34, 0.5);
    border-color: var(--border-light);
  }

  .section__title strong {
    color: var(--text-primary);
  }

  .plugin-item {
    background: var(--bg-secondary);
    border-color: var(--border-light);
  }

  .plugin-item:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--border-medium);
  }

  .plugin-item input[type="checkbox"] {
    accent-color: var(--primary);
  }

  .plugin-item span {
    color: var(--text-secondary);
  }

  .label {
    color: var(--text-secondary);
  }

  .input {
    background: var(--bg-secondary);
    border-color: var(--border-light);
    color: var(--text-primary);
  }

  .input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
  }

  .input::placeholder {
    color: var(--text-tertiary);
  }

  .hint {
    color: var(--text-tertiary);
  }

  .btn {
    background: var(--bg-secondary);
    border-color: var(--border-light);
    color: var(--text-primary);
  }

  .btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--border-medium);
  }

  .btn--close {
    color: var(--text-secondary);
  }

  .btn--subtle {
    color: var(--text-secondary);
    background: var(--bg-secondary);
    border-color: var(--border-medium);
  }

  .btn--subtle:hover {
    color: var(--primary);
    border-color: rgba(45, 212, 191, 0.35);
    background: rgba(13, 148, 136, 0.1);
  }

  .drawer__footer {
    border-top-color: var(--border-light);
  }
}

@media (prefers-reduced-motion: reduce) {
  .drawer-mask,
  .drawer {
    animation: none;
  }

  .plugin-item:hover,
  .btn:hover {
    transform: none;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
</style>
