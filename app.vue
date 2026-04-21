<template>
  <div class="layout">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <!-- 顶部导航 -->
    <header class="header">
      <nav class="nav">
        <NuxtLink to="/" class="brand">
          <span class="brand-icon">🔍</span>
          <span class="brand-text">PanHub</span>
        </NuxtLink>
        <div class="nav-actions">
          <!-- GitHub 链接 -->
          <a
            href="https://github.com/wu529778790/panhub.shenzjd.com"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-icon github-btn"
            aria-label="打开 GitHub 仓库"
            title="GitHub 仓库">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <!-- 设置按钮 -->
          <button class="btn-icon" type="button" @click="openSettings = true" aria-label="打开设置" title="设置">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main">
      <NuxtPage />
    </main>

    <!-- 设置抽屉 -->
    <ClientOnly>
      <SettingsDrawer
        v-model="settings"
        v-model:open="openSettings"
        :all-plugins="ALL_PLUGIN_NAMES"
        :all-tg-channels="allTgChannels"
        @save="saveSettings"
        @reset-default="resetToDefault" />
    </ClientOnly>

    <!-- Toast 通知 -->
    <div v-if="toast.show" class="toast" :class="toast.type" role="status" aria-live="polite">
      {{ toast.message }}
    </div>

    <!-- 密码门（仅在用户发起搜索时弹出） -->
    <ClientOnly>
      <PasswordGate
        :show="showPasswordGate"
        :error="auth.error.value || ''"
        :submitting="unlockSubmitting"
        @unlock="onUnlock" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ALL_PLUGIN_NAMES } from "./config/plugins";
import channelsConfig from "~/config/channels.json";

const { settings, loadSettings, saveSettings, resetToDefault } = useSettings();
const auth = useAuth();
const openSettings = ref(false);
const showPasswordGate = ref(false);
const unlockSubmitting = ref(false);
const pendingOnUnlock = ref<(() => void) | null>(null);

function requestUnlock(onSuccess?: () => void) {
  pendingOnUnlock.value = onSuccess ?? null;
  showPasswordGate.value = true;
}

async function onUnlock(password: string) {
  unlockSubmitting.value = true;
  const ok = await auth.unlock(password);
  unlockSubmitting.value = false;
  if (ok) {
    showPasswordGate.value = false;
    const cb = pendingOnUnlock.value;
    pendingOnUnlock.value = null;
    if (cb) {
      nextTick(() => cb());
    }
  }
}

provide("requestUnlock", requestUnlock);

// Toast 状态
const toast = ref({
  show: false,
  message: "",
  type: "info" as "info" | "success" | "error",
});

// 显示 Toast
function showToast(message: string, type: "info" | "success" | "error" = "info") {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
}

// 所有可用的 TG 频道（用于设置面板）
const allTgChannels = computed(() => {
  const configChannels = (useRuntimeConfig().public as any)?.tgDefaultChannels;
  return Array.isArray(configChannels) && configChannels.length > 0
    ? configChannels
    : channelsConfig.defaultChannels;
});

// 监听设置保存事件，显示提示
watch(() => settings.value, (newVal, oldVal) => {
  if (oldVal && newVal && JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
    showToast("设置已保存", "success");
  }
}, { deep: true });

onMounted(() => {
  loadSettings();
  auth.fetchStatus();
});

// 暴露给子组件使用
provide('showToast', showToast);
</script>

<style>
/* 全局样式重置和现代化设计系统 */
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Noto+Sans+SC:wght@400;500;700;900&family=Syne:wght@600;700;800&display=swap");

:root {
  --primary: #0f766e;
  --primary-dark: #115e59;
  --secondary: #f59e0b;
  --success: #10b981;
  --warning: #d97706;
  --error: #ef4444;

  --bg-primary: #fffdf8;
  --bg-secondary: #f7f3ea;
  --bg-glass: rgba(255, 253, 248, 0.86);

  --text-primary: #1f2937;
  --text-secondary: #4b5563;
  --text-tertiary: #9ca3af;

  --border-light: #e5dfd0;
  --border-medium: #d4c7ab;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}

/* 基础重置 */
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: "Manrope", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  background: radial-gradient(circle at 12% -10%, #fff3d9 0%, transparent 42%),
    radial-gradient(circle at 90% 8%, #d9f7f3 0%, transparent 35%),
    #fffdf8;
  color: var(--text-primary);

  /* iOS Safari兼容性 */
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  -webkit-overflow-scrolling: touch;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-medium);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* 输入框基础样式 */
input[type="text"],
input[type="search"],
input[type="email"],
input[type="password"],
input[type="number"],
textarea,
select {
  -webkit-appearance: none;
  -webkit-border-radius: 0;
  border-radius: 0;
  -webkit-text-size-adjust: 100%;
  font-family: inherit;
}

/* 按钮基础样式 */
button {
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  font-family: inherit;
  cursor: pointer;
}

/* iOS Safari触摸区域优化 */
@media (max-width: 640px) {
  button,
  input,
  select,
  textarea {
    min-height: 44px;
    min-width: 44px;
  }
}

/* 动画定义 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes blobFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>

<style scoped>
/* 主布局 */
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
}

/* 背景装饰 - 玻璃拟态效果 */
.bg-decoration {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
  opacity: 0.28;
  animation: blobFloat 8s ease-in-out infinite;
}

.blob-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.blob-2 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #f59e0b, #fb7185);
  bottom: -50px;
  right: -50px;
  animation-delay: 2s;
}

.blob-3 {
  width: 250px;
  height: 250px;
  background: linear-gradient(135deg, #0ea5e9, #14b8a6);
  top: 50%;
  left: 70%;
  animation-delay: 4s;
}

/* 顶部导航 - 玻璃拟态 */
.header {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-sm);
}

.nav {
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

/* 品牌标识 */
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 700;
  font-size: 20px;
  transition: transform var(--transition-fast);
}

.brand:hover {
  transform: scale(1.05);
}

.brand-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(15, 118, 110, 0.3));
}

.brand-text {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 导航操作区 */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 图标按钮 */
.btn-icon {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  transition: background-color var(--transition-fast), color var(--transition-fast),
    transform var(--transition-fast), box-shadow var(--transition-fast);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-icon:active {
  transform: translateY(0);
}

.btn-icon svg {
  stroke: currentColor;
}

/* GitHub 按钮特殊样式 */
.github-btn {
  color: var(--text-secondary);
}

.github-btn:hover {
  color: var(--primary);
  background: rgba(255, 255, 255, 0.8);
}

.github-btn svg {
  stroke: none;
  fill: currentColor;
}

/* 主内容区 */
.main {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
  animation: fadeIn 0.5s ease;
}

/* Toast 通知 */
.toast {
  position: fixed;
  top: 80px;
  right: 24px;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-light);
  font-weight: 500;
  z-index: 1000;
  animation: slideInRight 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.toast::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.toast.info {
  color: var(--primary);
  border-left: 4px solid var(--primary);
}

.toast.success {
  color: var(--success);
  border-left: 4px solid var(--success);
}

.toast.error {
  color: var(--error);
  border-left: 4px solid var(--error);
}

/* 移动端优化 */
@media (max-width: 640px) {
  .nav {
    padding: 12px 16px;
  }

  .main {
    padding: 16px;
  }

  .brand {
    font-size: 18px;
  }

  .btn-icon {
    width: 36px;
    height: 36px;
  }

  .toast {
    right: 16px;
    left: 16px;
    top: 70px;
  }

  .blob {
    filter: blur(40px);
  }
}

/* 深色模式 - Obsidian Tide 主题 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #0d1117;
    --bg-secondary: #161b22;
    --bg-glass: rgba(13, 17, 23, 0.82);
    --text-primary: #e6edf3;
    --text-secondary: #9198a1;
    --text-tertiary: #545d68;
    --border-light: #21262d;
    --border-medium: #30363d;
    --primary: #2dd4bf;
    --primary-dark: #14b8a6;
    --secondary: #fbbf24;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  }

  body {
    background:
      radial-gradient(ellipse at 10% 0%, rgba(13, 148, 136, 0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 85% 5%, rgba(217, 119, 6, 0.08) 0%, transparent 40%),
      #0a0e14;
  }

  .blob {
    opacity: 0.12;
  }

  .blob-1 {
    background: linear-gradient(135deg, #0d9488, #2dd4bf);
  }

  .blob-2 {
    background: linear-gradient(135deg, #d97706, #fbbf24);
  }

  .blob-3 {
    background: linear-gradient(135deg, #0891b2, #2dd4bf);
  }

  .header {
    background: rgba(13, 17, 23, 0.78);
    border-bottom: 1px solid var(--border-light);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
  }

  .brand-text {
    background: linear-gradient(135deg, #2dd4bf, #fbbf24);
    -webkit-background-clip: text;
    background-clip: text;
  }

  .btn-icon {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--border-light);
    color: var(--text-secondary);
  }

  .btn-icon:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--border-medium);
    color: var(--text-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .github-btn {
    color: var(--text-tertiary);
  }

  .github-btn:hover {
    color: var(--text-primary);
  }

  .toast {
    background: var(--bg-secondary);
    border-color: var(--border-light);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .toast.info {
    color: var(--primary);
    border-left-color: var(--primary);
  }

  .toast.success {
    color: #34d399;
    border-left-color: #34d399;
  }

  .toast.error {
    color: #f87171;
    border-left-color: #f87171;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--border-medium);
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--text-tertiary);
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .btn-icon {
    border-width: 2px;
  }

  .brand-text {
    -webkit-text-fill-color: var(--text-primary);
    color: var(--text-primary);
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .blob {
    animation: none;
  }
}
</style>
