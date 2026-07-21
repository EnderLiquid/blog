<script setup lang="ts">
import { findArticleDelivery } from '~/utils/article-delivery';
import { formatPostDate, toDateTime } from '~/utils/date';
import { groupPostVariants, requirePostVariant } from '~/utils/posts';
import { postsPath } from '~~/shared/routing/localized-routes';

const { localeCode, messages } = useSiteLocale();
const { data: posts } = await useAsyncData('home-posts', () =>
  queryCollection('posts').where('draft', '=', false).order('publishedAt', 'DESC').all(),
);

const recentPosts = computed(() =>
  groupPostVariants(posts.value ?? [])
    .map((logicalPost) => {
      const delivery = findArticleDelivery(logicalPost.articleKeyPath, localeCode.value);

      if (!delivery) {
        throw new Error(`文章 ${logicalPost.articleKeyPath} 缺少${localeCode.value}投递页面`);
      }

      return {
        articleKeyPath: logicalPost.articleKeyPath,
        displayPath: delivery.path,
        post: requirePostVariant(logicalPost, delivery.contentLocaleCode),
      };
    })
    .sort(
      (left, right) =>
        new Date(right.post.publishedAt).getTime() - new Date(left.post.publishedAt).getTime(),
    )
    .slice(0, 5),
);
</script>

<template>
  <LayoutPageShell>
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
        <li v-for="item in recentPosts" :key="item.articleKeyPath">
          <NuxtLink :to="item.displayPath">
            <span :lang="item.post.localeCode">{{ item.post.title }}</span>
            <time :datetime="toDateTime(item.post.publishedAt)">
              {{ formatPostDate(item.post.publishedAt, localeCode) }}
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
