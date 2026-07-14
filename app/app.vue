<script setup lang="ts">
const { localeDefinition } = useSiteLocale();

// HTML language 由应用根部统一管理，页面只负责自身 SEO metadata。
useHead(() => ({
  htmlAttrs: {
    lang: localeDefinition.value.languageTag,
  },
}));
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
</template>
