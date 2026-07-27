<template>
  <SeoHubPage :hub="hub" :pages="topicPages" />
</template>

<script setup lang="ts">
import { seoHubs, topicPages } from "~/config/seoContent";

const hub = seoHubs.find((item) => item.kind === "topic")!;
</script>
