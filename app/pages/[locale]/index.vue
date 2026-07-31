<script setup lang="ts">
import { findArticleDelivery } from '~/utils/article-delivery';
import { formatPostDate, toDateTime } from '~/utils/date';
import { groupPostVariants, requirePostVariant } from '~/utils/posts';
import { aboutPath, postsPath } from '~~/shared/routing/localized-routes';
import { FEATURED_ARTICLE_KEYS } from '~~/shared/site-definitions/home';

const { localeCode, messages } = useSiteLocale();
const { data: posts } = await useAsyncData('home-posts', () =>
  queryCollection('posts').where('draft', '=', false).all(),
);

const featuredPosts = computed(() => {
  const logicalPostsByKey = new Map(
    groupPostVariants(posts.value ?? []).map((logicalPost) => [
      logicalPost.articleKeyPath,
      logicalPost,
    ]),
  );

  return FEATURED_ARTICLE_KEYS.map((articleKeyPath) => {
    const logicalPost = logicalPostsByKey.get(articleKeyPath);
    if (!logicalPost) {
      throw new Error(`首页精选文章不存在：${articleKeyPath}`);
    }

    const delivery = findArticleDelivery(articleKeyPath, localeCode.value);
    if (!delivery) {
      throw new Error(`文章 ${articleKeyPath} 缺少${localeCode.value}投递页面`);
    }

    return {
      articleKeyPath,
      displayPath: delivery.path,
      post: requirePostVariant(logicalPost, delivery.contentLocaleCode),
    };
  });
});
</script>

<template>
  <LayoutPageShell wide>
    <div class="home-page">
      <header class="home-cover">
        <div class="home-wordmark-lockup">
          <h1 class="home-wordmark" aria-label="EnderLiquid">
            <span class="home-wordmark__ender" aria-hidden="true">Ender</span>
            <span class="home-wordmark__liquid-line" aria-hidden="true">
              <span>Liquid</span><span class="home-wordmark__period">.</span>
            </span>
          </h1>
          <span class="home-wordmark-rule" aria-hidden="true" />
        </div>

        <p class="home-welcome">
          <span v-for="line in messages.home.welcome" :key="line">{{ line }}</span>
        </p>
      </header>

      <section
        v-if="featuredPosts.length > 0"
        class="featured-posts"
        aria-labelledby="featured-posts-title"
      >
        <h2 id="featured-posts-title">{{ messages.home.featuredPosts }}</h2>

        <ol class="featured-posts__list">
          <li
            v-for="(item, index) in featuredPosts"
            :key="item.articleKeyPath"
            class="featured-post"
            :class="{ 'featured-post--lead': index === 0 }"
          >
            <NuxtLink :to="item.displayPath">
              <span class="featured-post__copy">
                <span class="featured-post__title" :lang="item.post.localeCode">
                  {{ item.post.title }}
                </span>
                <span class="featured-post__description" :lang="item.post.localeCode">
                  {{ item.post.description }}
                </span>
              </span>

              <span class="featured-post__meta">
                <time :datetime="toDateTime(item.post.publishedAt)">
                  {{ formatPostDate(item.post.publishedAt, localeCode) }}
                </time>
                <span class="featured-post__arrow" aria-hidden="true">↗</span>
              </span>
            </NuxtLink>
          </li>
        </ol>
      </section>

      <nav class="home-destinations" :aria-label="messages.navigation.label">
        <NuxtLink class="home-destination" :to="postsPath(localeCode)">
          <span class="home-destination__title">{{ messages.home.postsEntryTitle }}</span>
          <span class="home-destination__description">
            {{ messages.home.postsEntryDescription }}
          </span>
          <span class="home-destination__arrow" aria-hidden="true">→</span>
        </NuxtLink>

        <NuxtLink class="home-destination" :to="aboutPath(localeCode)">
          <span class="home-destination__title">{{ messages.home.aboutEntryTitle }}</span>
          <span class="home-destination__description">
            {{ messages.home.aboutEntryDescription }}
          </span>
          <span class="home-destination__arrow" aria-hidden="true">→</span>
        </NuxtLink>
      </nav>
    </div>
  </LayoutPageShell>
</template>

<style scoped>
.home-page {
  container: home / inline-size;
}

.home-cover {
  display: flex;
  min-height: clamp(30rem, 56cqi, 38rem);
  flex-direction: column;
  border-bottom: 1px solid var(--line);
}

.home-wordmark-lockup {
  display: grid;
  grid-template-columns: auto minmax(4rem, 1fr);
  align-items: end;
  gap: clamp(1.5rem, 3cqi, 3rem);
  overflow: visible;
}

.home-wordmark {
  display: inline-flex;
  margin: 0;
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: clamp(4.75rem, 11cqi, 8.5rem);
  font-weight: 700;
  letter-spacing: -0.085em;
  line-height: 0.92;
  white-space: nowrap;
}

.home-wordmark__liquid-line {
  display: inline-flex;
}

.home-wordmark__period {
  color: var(--signal);
}

.home-wordmark-rule {
  margin-bottom: 0.12em;
  border-top: 1px solid color-mix(in srgb, var(--signal) 62%, var(--line));
}

.home-welcome {
  display: grid;
  align-self: flex-end;
  margin: auto 0 clamp(3.5rem, 7cqi, 5.5rem);
  max-width: 24rem;
  font-size: clamp(1rem, 1.8cqi, 1.2rem);
  line-height: 1.8;
}

.featured-posts {
  padding: clamp(4.5rem, 8cqi, 7rem) 0 0;
}

.featured-posts h2 {
  margin: 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--line);
  font-size: 1rem;
  font-weight: 600;
}

.featured-posts__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.featured-post {
  border-bottom: 1px solid var(--line);
}

.featured-post a {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: clamp(2rem, 6cqi, 6rem);
  padding: 1.5rem 0;
  text-decoration: none;
}

.featured-post__copy {
  display: grid;
  gap: 0.7rem;
  min-width: 0;
}

.featured-post__title {
  font-family: var(--font-serif);
  font-size: clamp(1.5rem, 3cqi, 2.25rem);
  line-height: 1.16;
  text-wrap: balance;
}

.featured-post--lead a {
  padding: clamp(2.25rem, 5cqi, 4rem) 0;
}

.featured-post--lead .featured-post__title {
  max-width: 15ch;
  font-size: clamp(2.75rem, 6.5cqi, 5rem);
  line-height: 0.98;
  letter-spacing: -0.045em;
}

.featured-post__description {
  max-width: 44rem;
  color: var(--muted);
  font-family: var(--font-serif);
  font-size: 1rem;
  line-height: 1.65;
}

.featured-post__meta {
  display: flex;
  align-items: flex-end;
  align-self: stretch;
  gap: 1rem;
  color: var(--muted);
  font-size: 0.82rem;
  white-space: nowrap;
}

.featured-post__arrow,
.home-destination__arrow {
  color: var(--signal);
  transition: transform 140ms ease;
}

.featured-post a:hover .featured-post__title,
.featured-post a:focus-visible .featured-post__title,
.home-destination:hover .home-destination__title,
.home-destination:focus-visible .home-destination__title {
  color: var(--signal);
}

.featured-post a:hover .featured-post__arrow,
.featured-post a:focus-visible .featured-post__arrow,
.home-destination:hover .home-destination__arrow,
.home-destination:focus-visible .home-destination__arrow {
  transform: translateX(0.2rem);
}

.home-destinations {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  margin-top: clamp(5rem, 10cqi, 8rem);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.home-destination {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.55rem 2rem;
  padding: clamp(1.5rem, 4cqi, 2.5rem);
  text-decoration: none;
}

.home-destination + .home-destination {
  border-left: 1px solid var(--line);
}

.home-destination__title {
  font-size: clamp(1.25rem, 2.4cqi, 1.75rem);
  font-weight: 700;
}

.home-destination__description {
  grid-column: 1;
  color: var(--muted);
  font-family: var(--font-serif);
  line-height: 1.5;
}

.home-destination__arrow {
  grid-row: 1 / span 2;
  grid-column: 2;
  align-self: center;
  font-size: 1.4rem;
}

@container home (max-width: 52rem) {
  .home-cover {
    min-height: 34rem;
  }

  .home-wordmark-lockup {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }

  .home-wordmark {
    display: block;
    font-size: clamp(4.75rem, 16cqi, 7.5rem);
  }

  .home-wordmark__ender,
  .home-wordmark__liquid-line {
    display: flex;
    width: fit-content;
  }

  .home-wordmark__liquid-line {
    margin-left: 0;
  }

  .home-welcome {
    align-self: flex-start;
  }

  .featured-post--lead .featured-post__title {
    max-width: 18ch;
  }
}

@container home (max-width: 38rem) {
  .home-cover {
    min-height: 0;
    padding-bottom: 4rem;
  }

  .home-wordmark-lockup {
    gap: 2rem;
  }

  .home-wordmark {
    font-size: clamp(3.65rem, 19cqi, 5.5rem);
    line-height: 0.92;
  }

  .home-wordmark__liquid-line {
    margin-left: 0;
  }

  .home-welcome {
    margin: 4rem 0 0;
    font-size: 1rem;
  }

  .featured-posts {
    padding-top: 4rem;
  }

  .featured-post a,
  .featured-post--lead a {
    grid-template-columns: 1fr;
    gap: 1.25rem;
    padding: 2rem 0;
  }

  .featured-post--lead .featured-post__title {
    font-size: clamp(2.35rem, 12cqi, 3.25rem);
  }

  .featured-post__meta {
    justify-content: space-between;
  }

  .home-destinations {
    grid-template-columns: 1fr;
    margin-top: 4rem;
  }

  .home-destination {
    padding: 1.5rem 0;
  }

  .home-destination + .home-destination {
    border-top: 1px solid var(--line);
    border-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .featured-post__arrow,
  .home-destination__arrow {
    transition: none;
  }
}
</style>
