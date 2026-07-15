<script setup lang="ts">
const { localeCode } = useSiteLocale();

// 页面metadata来自构建期SEO投影；该调用同时覆盖直接预渲染与客户端导航。
useSiteSeo();

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
