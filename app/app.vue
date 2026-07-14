<script setup lang="ts">
const { localeCode } = useSiteLocale();

// HTML语言由应用根部统一管理，页面只负责自身 SEO metadata。
useHead(() => ({
  htmlAttrs: {
    lang: localeCode.value,
  },
}));
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
</template>
