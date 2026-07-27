<template>
  <SeoHubPage :hub="hub" :pages="panPages" />
</template>

<script setup lang="ts">
import { panPages, seoHubs } from "~/config/seoContent";

const hub = seoHubs.find((item) => item.kind === "pan")!;
</script>
