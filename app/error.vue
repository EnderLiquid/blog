<script setup lang="ts">
import type { NuxtError } from '#app';
import { homePath, postsPath } from '~/utils/localized-routes';

const props = defineProps<{
  error: NuxtError;
}>();

const { localeKey, messages } = useSiteLocale();
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
    @home="leaveErrorPage(homePath(localeKey))"
    @posts="leaveErrorPage(postsPath(localeKey))"
  />
</template>
