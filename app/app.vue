<script setup lang="ts">
import { LOCALE_DEFINITIONS } from '~~/shared/i18n/locales';
import { parseLocalizedPath, rssPath } from '~~/shared/routing/localized-routes';
import { absoluteSiteUrl, SITE_METADATA } from '~~/shared/site/config';

const route = useRoute();
const { localeCode } = useSiteLocale();

// HTML语言与 RSS discovery link由应用根部统一管理，页面只负责自身 SEO metadata。
useHead(() => {
  const localizedPath = parseLocalizedPath(route.path);
  const feedLocales = localizedPath
    ? LOCALE_DEFINITIONS.filter((definition) => definition.code === localizedPath.localeCode)
    : LOCALE_DEFINITIONS;

  return {
    htmlAttrs: {
      lang: localeCode.value,
    },
    link: feedLocales.map((definition) => ({
      rel: 'alternate',
      type: 'application/rss+xml',
      title: `${SITE_METADATA[definition.code].title} · ${definition.label}`,
      href: absoluteSiteUrl(rssPath(definition.code)),
    })),
  };
});
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
</template>
