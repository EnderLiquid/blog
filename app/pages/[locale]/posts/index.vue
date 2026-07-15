<script setup lang="ts">
import { homePath, switchLocalePath } from '~~/shared/routing/localized-routes';
import { LOCALE_DEFINITIONS } from '~~/shared/i18n/locales';

const route = useRoute();
const { localeCode, messages } = useSiteLocale();
const { data: posts } = await useAsyncData('all-posts', () =>
  queryCollection('posts').where('draft', '=', false).order('publishedAt', 'DESC').all(),
);

const localeLinks = computed(() =>
  LOCALE_DEFINITIONS.map((definition) => ({
    localeCode: definition.code,
    label: definition.label,
    path: switchLocalePath(route.fullPath, definition.code),
  })),
);
</script>

<template>
  <LayoutPageShell>
    <div class="page-navigation">
      <NuxtLink class="back-link" :to="homePath(localeCode)">
        ← {{ messages.posts.backHome }}
      </NuxtLink>
      <NavigationLocaleLinks
        :links="localeLinks"
        :current-locale-code="localeCode"
        label="Language / 语言"
      />
    </div>

    <header class="page-header">
      <h1>{{ messages.posts.title }}</h1>
      <p>{{ messages.posts.description }}</p>
    </header>

    <SearchPostSearch :posts="posts ?? []" />
  </LayoutPageShell>
</template>

<style scoped>
.page-navigation {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.back-link {
  color: var(--signal);
}

.page-header {
  margin: 4rem 0;
}

.page-header h1 {
  margin: 0.25rem 0 1rem;
  font-family: var(--font-serif);
  font-size: clamp(2.8rem, 8vw, 5.5rem);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.06em;
}

.page-header p {
  color: var(--muted);
  font-size: 1.1rem;
}

@media (max-width: 36rem) {
  .page-navigation {
    flex-direction: column;
  }
}
</style>
