<template>
  <SeoHubPage :hub="hub" :pages="pages" />
</template>

<script setup lang="ts">
import { guidePages, seoHubs } from "~/config/seoContent";

const hub = seoHubs.find((item) => item.kind === "guide")!;
const { data } = await useFetch("/api/geo/pages", {
  query: { limit: 80 },
});
const pages = computed(() => [
  ...guidePages,
  ...(data.value?.data || []),
]);
</script>
