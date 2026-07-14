<script setup lang="ts">
import { homePath, postsPath } from '~/utils/localized-routes';

// GitHub Pages 要求错误文档位于 /404.html，因此为它声明一个明确的静态页面，
// 而不是依赖空的 SPA fallback 再触发一次客户端路由错误。
definePageMeta({
  path: '/404.html',
});

const { localeKey, messages } = useSiteLocale();

useSeoMeta({
  title: () => `404 · ${messages.value.notFound.title}`,
  robots: 'noindex, follow',
});
</script>

<template>
  <ErrorNotFoundView
    :status-code="404"
    @home="navigateTo(homePath(localeKey))"
    @posts="navigateTo(postsPath(localeKey))"
  />
</template>
