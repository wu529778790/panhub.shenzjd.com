<template>
  <SeoContentPage :page="page" />
</template>

<script setup lang="ts">
import { getSeoPage } from "~/config/seoContent";

const page = getSeoPage("/privacy")!;
</script>
