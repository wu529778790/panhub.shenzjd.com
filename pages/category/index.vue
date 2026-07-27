<template>
  <SeoHubPage :hub="hub" :pages="categoryPages" />
</template>

<script setup lang="ts">
import { categoryPages, seoHubs } from "~/config/seoContent";

const hub = seoHubs.find((item) => item.kind === "category")!;
</script>
