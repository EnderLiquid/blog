<script setup lang="ts">
import type { LocaleKey } from '~~/shared/i18n/locales';

export interface LocaleLink {
  localeKey: LocaleKey;
  label: string;
  path: string;
}

defineProps<{
  links: LocaleLink[];
  currentLocaleKey: LocaleKey;
  label: string;
}>();
</script>

<template>
  <nav class="locale-links" :aria-label="label">
    <NuxtLink
      v-for="link in links"
      :key="link.localeKey"
      :to="link.path"
      :lang="link.localeKey"
      :aria-current="link.localeKey === currentLocaleKey ? 'page' : undefined"
    >
      {{ link.label }}
    </NuxtLink>
  </nav>
</template>

<style scoped>
.locale-links {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.locale-links [aria-current='page'] {
  color: var(--muted);
  text-decoration: none;
}
</style>
