<script setup lang="ts">
import type { NuxtError } from '#app';
import { homePath, postsPath } from '~~/shared/routing/localized-routes';

const props = defineProps<{
  error: NuxtError;
}>();

const { localeCode, messages } = useSiteLocale();
const statusCode = computed(() => props.error.statusCode || 500);

useSeoMeta({
  title: () => `${statusCode.value} · ${messages.value.notFound.title}`,
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
