<script setup lang="ts">
import { homePath, postsPath } from '~~/shared/routing/localized-routes';

// 文件名直接声明GitHub Pages要求的 /404.html，避免依赖空SPA fallback。
const { localeCode } = useSiteLocale();
</script>

<template>
  <ErrorNotFoundView
    :status-code="404"
    @home="navigateTo(homePath(localeCode))"
    @posts="navigateTo(postsPath(localeCode))"
  />
</template>
