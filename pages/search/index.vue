<template>
  <SeoHubPage :hub="hub" :pages="intentPages" />
</template>

<script setup lang="ts">
import { intentPages, seoHubs } from "~/config/seoContent";

const hub = seoHubs.find((item) => item.kind === "intent");
if (!hub) {
  throw createError({ statusCode: 500, message: "组合搜索入口配置缺失" });
}
</script>
