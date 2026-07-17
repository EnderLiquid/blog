<script setup lang="ts">
import type { NuxtError } from '#app';
import { homePath, postsPath } from '~~/shared/routing/localized-routes';
import { RUNTIME_ERROR_SEO_DEFINITIONS } from '~~/shared/site-definitions/page-seo';

const props = defineProps<{
  error: NuxtError;
}>();

const { localeCode } = useSiteLocale();
const statusCode = computed(() => props.error.statusCode || 500);

const errorSeo = computed(() => RUNTIME_ERROR_SEO_DEFINITIONS[localeCode.value]);

useSeoMeta({
  title: () => `${statusCode.value} · ${errorSeo.value.title}`,
  description: () => errorSeo.value.description,
  robots: 'noindex, follow',
});

function leaveErrorPage(targetPath: string): void {
  void clearError({ redirect: targetPath });
}
</script>

<template>
  <ErrorNotFoundView
    :status-code="statusCode"
    @home="leaveErrorPage(homePath(localeCode))"
    @posts="leaveErrorPage(postsPath(localeCode))"
  />
</template>
