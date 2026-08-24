<script setup lang="ts">
const { localeCode } = useSiteLocale();

// 页面metadata来自构建期SEO投影；该调用同时覆盖直接预渲染与客户端导航。
useSiteSeo();

useHead(() => ({
  htmlAttrs: {
    lang: localeCode.value,
  },
  link: [
    { key: 'site-favicon-svg', rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    {
      key: 'site-favicon-ico',
      rel: 'icon',
      type: 'image/x-icon',
      href: '/favicon.ico',
      sizes: 'any',
    },
    {
      key: 'site-apple-touch-icon',
      rel: 'apple-touch-icon',
      href: '/apple-touch-icon.png',
      sizes: '180x180',
    },
    { key: 'site-webmanifest', rel: 'manifest', href: '/site.webmanifest' },
  ],
  meta: [
    { name: 'application-name', content: 'EnderLiquid' },
    {
      name: 'apple-mobile-web-app-title',
      content: 'EnderLiquid',
    },
    {
      name: 'theme-color',
      content: '#e9e5d8',
      media: '(prefers-color-scheme: light)',
    },
    {
      name: 'theme-color',
      content: '#22231f',
      media: '(prefers-color-scheme: dark)',
    },
  ],
}));
</script>

<template>
  <NuxtRouteAnnouncer />
  <ShellWorkspace>
    <NuxtPage />
  </ShellWorkspace>
</template>
