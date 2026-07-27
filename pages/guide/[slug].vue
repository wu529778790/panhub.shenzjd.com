<template>
  <SeoContentPage :page="page" />
</template>

<script setup lang="ts">
import { getSeoPageByKind } from "~/config/seoContent";

const route = useRoute();
const slug = String(route.params.slug);
const staticPage = getSeoPageByKind("guide", slug);
const { data: dynamicResponse } = await useFetch(
  `/api/geo/page/${encodeURIComponent(slug)}`,
  { immediate: !staticPage }
);
const page = computed(
  () => staticPage || dynamicResponse.value?.data || null
);
if (!page.value) {
  throw createError({ statusCode: 404, message: "没有找到这篇使用指南" });
}
</script>
