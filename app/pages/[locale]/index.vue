<script setup lang="ts">
import { formatPostDate, toDateTime } from '~/utils/date';
import { groupPostVariants, selectPostVariant } from '~/utils/posts';
import { LOCALE_DEFINITIONS } from '~~/shared/i18n/locales';
import { homePath, postsPath } from '~~/shared/routing/localized-routes';

const { localeCode, messages } = useSiteLocale();
const { data: posts } = await useAsyncData('home-posts', () =>
  queryCollection('posts').where('draft', '=', false).order('publishedAt', 'DESC').all(),
);

const recentPosts = computed(() =>
  groupPostVariants(posts.value ?? [])
    .map((logicalPost) => selectPostVariant(logicalPost, localeCode.value))
    .sort(
      (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
    )
    .slice(0, 5),
);

const localeLinks = computed(() =>
  LOCALE_DEFINITIONS.map((definition) => ({
    localeCode: definition.code,
    label: definition.label,
    path: homePath(definition.code),
  })),
);
</script>

<template>
  <LayoutPageShell>
    <NavigationLocaleLinks
      :links="localeLinks"
      :current-locale-code="localeCode"
      label="Language / 语言"
    />

    <header class="site-header">
      <p class="prompt">visitor@blog:~$</p>
      <h1>{{ messages.home.title }}</h1>
      <p>{{ messages.home.description }}</p>
      <p>{{ messages.home.shellPlaceholder }}</p>
    </header>

    <section aria-labelledby="recent-posts-title">
      <h2 id="recent-posts-title">
        {{ messages.home.recentPosts }} ·
        <NuxtLink :to="postsPath(localeCode)">{{ messages.home.allPosts }}</NuxtLink>
      </h2>

      <ul class="post-list">
        <li v-for="post in recentPosts" :key="post.path">
          <NuxtLink :to="post.path">
            <span>{{ post.title }}</span>
            <time :datetime="toDateTime(post.publishedAt)">
              {{ formatPostDate(post.publishedAt, post.localeCode) }}
            </time>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </LayoutPageShell>
</template>

<style scoped>
.site-header {
  margin: 4rem 0 5rem;
}

.site-header h1 {
  margin: 0.25rem 0 1rem;
  font-family: var(--font-serif);
  font-size: clamp(3rem, 11vw, 7rem);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.06em;
}

.prompt {
  color: var(--signal);
}

h2 {
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--line);
  font-size: 1rem;
  font-weight: 600;
}

.post-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-list a {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2rem;
  padding: 1rem 0;
  border-bottom: 1px dotted var(--line);
  text-decoration: none;
}

.post-list a:hover,
.post-list a:focus-visible {
  color: var(--signal);
}

.post-list time {
  color: var(--muted);
  font-size: 0.85rem;
}

@media (max-width: 36rem) {
  .post-list a {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }
}
</style>
