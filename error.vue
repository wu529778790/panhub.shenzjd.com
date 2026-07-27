<template>
  <main class="error-page">
    <NuxtLink class="error-brand" to="/" aria-label="返回好搜库首页">
      <img src="/brand-mark.svg" alt="" width="44" height="44" />
      <span>好搜库</span>
    </NuxtLink>

    <section>
      <p>{{ statusCode }}</p>
      <h1>{{ statusCode === 404 ? "这个页面没有找到" : "页面暂时无法打开" }}</h1>
      <span>
        {{ statusCode === 404
          ? "地址可能已经调整。你可以返回首页搜索，或从平台和分类入口继续浏览。"
          : "服务遇到临时问题，请稍后重试。已有的搜索和收藏数据不会因此改变。" }}
      </span>
      <div>
        <button type="button" @click="goHome">返回首页</button>
        <NuxtLink to="/category">浏览分类</NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const props = defineProps<{ error: { statusCode?: number } }>();
const statusCode = computed(() => Number(props.error?.statusCode || 500));

useHead({
  title: statusCode.value === 404 ? "页面未找到 - 好搜库" : "页面暂时不可用 - 好搜库",
  meta: [{ name: "robots", content: "noindex,nofollow" }],
});

function goHome() {
  clearError({ redirect: "/" });
}
</script>

<style>
@import "~/assets/css/global.css";

.error-page {
  display: grid;
  width: min(100% - 40px, 1080px);
  min-height: 100dvh;
  margin: 0 auto;
  grid-template-rows: auto 1fr;
  padding: 28px 0 60px;
}

.error-brand {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 11px;
  font-size: 17px;
  font-weight: 780;
  letter-spacing: -0.04em;
}

.error-brand img {
  border-radius: 12px;
}

.error-page section {
  align-self: center;
  max-width: 720px;
  padding: 64px 0 110px;
}

.error-page section > p {
  margin: 0 0 20px;
  color: var(--primary-strong);
  font-size: 13px;
  font-weight: 760;
  font-variant-numeric: tabular-nums;
}

.error-page h1 {
  margin: 0;
  font-size: clamp(44px, 8vw, 84px);
  font-weight: 820;
  letter-spacing: -0.065em;
  line-height: 1.05;
  text-wrap: balance;
}

.error-page section > span {
  display: block;
  max-width: 56ch;
  margin-top: 24px;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.85;
}

.error-page section > div {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
}

.error-page button,
.error-page section div a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border: 0;
  font-size: 13px;
  font-weight: 700;
}

.error-page button {
  padding: 0 18px;
  border-radius: var(--radius-md);
  background: var(--primary);
  color: var(--text-on-primary);
}

.error-page section div a {
  color: var(--text-secondary);
}

.error-page section div a:hover {
  color: var(--text-primary);
}

@media (max-width: 520px) {
  .error-page {
    width: min(100% - 28px, 1080px);
  }

  .error-page section {
    padding-bottom: 70px;
  }

  .error-page section > div {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
