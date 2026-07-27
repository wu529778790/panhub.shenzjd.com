<template>
  <SeoContentPage :page="page" />
</template>

<script setup lang="ts">
import { getSeoPageByKind } from "~/config/seoContent";

const route = useRoute();
const page = getSeoPageByKind("pan", String(route.params.slug));
if (!page) {
  throw createError({ statusCode: 404, message: "没有找到这个网盘平台页面" });
}
</script>
