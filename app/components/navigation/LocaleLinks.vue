<script setup lang="ts">
import type { LocaleCode } from '~~/shared/i18n/locales';

export interface LocaleLink {
  localeCode: LocaleCode;
  label: string;
  path: string;
}

defineProps<{
  links: LocaleLink[];
  currentLocaleCode: LocaleCode;
  label: string;
}>();
</script>

<template>
  <nav class="locale-links" :aria-label="label">
    <NuxtLink
      v-for="link in links"
      :key="link.localeCode"
      :to="link.path"
      :lang="link.localeCode"
      :aria-current="link.localeCode === currentLocaleCode ? 'page' : undefined"
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
