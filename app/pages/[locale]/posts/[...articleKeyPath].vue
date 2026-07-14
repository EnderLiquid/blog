<script setup lang="ts">
import { formatPostDate, toDateTime } from '~/utils/date';
import { postContentPath } from '~/utils/posts';
import { articlePath, normalizeArticleKeyPath, postsPath } from '~/utils/localized-routes';
import { DEFAULT_LOCALE_CODE, LOCALE_DEFINITIONS } from '~~/shared/i18n/locales';

const route = useRoute();
const { localeCode, messages } = useSiteLocale();
const articleKeyPath = readArticleKeyPath(route.params.articleKeyPath);
const currentContentPath = postContentPath(articleKeyPath, localeCode.value);

const { data: post } = await useAsyncData(`post:${currentContentPath}`, () =>
  queryCollection('posts').path(currentContentPath).first(),
);

if (!post.value || post.value.draft) {
  throw createError({
    statusCode: 404,
    message: messages.value.notFound.title,
  });
}

const { data: translations } = await useAsyncData(`translations:${articleKeyPath}`, async () => {
  const candidates = await Promise.all(
    LOCALE_DEFINITIONS.map(async (definition) => {
      const translatedPost = await queryCollection('posts')
        .path(postContentPath(articleKeyPath, definition.code))
        .first();

      if (!translatedPost || translatedPost.draft) {
        return undefined;
      }

      return {
        localeCode: definition.code,
        label: definition.label,
        path: articlePath(definition.code, articleKeyPath),
      };
    }),
  );

  return candidates.filter((candidate) => candidate !== undefined);
});

const localeLinks = computed(() => translations.value ?? []);
const postTags = computed(() => post.value?.tags ?? []);

useSeoMeta({
  title: () => post.value?.title,
  description: () => post.value?.description,
});

useHead(() => {
  const availableTranslations = translations.value ?? [];
  const defaultTranslation =
    availableTranslations.find((translation) => translation.localeCode === DEFAULT_LOCALE_CODE) ??
    availableTranslations[0];

  return {
    link: [
      {
        rel: 'canonical',
        href: articlePath(localeCode.value, articleKeyPath),
      },
      ...availableTranslations.map((translation) => ({
        rel: 'alternate',
        hreflang: translation.localeCode,
        href: translation.path,
      })),
      ...(defaultTranslation
        ? [
            {
              rel: 'alternate',
              hreflang: 'x-default',
              href: defaultTranslation.path,
            },
          ]
        : []),
    ],
  };
});

function readArticleKeyPath(value: unknown): string {
  const pathSegments = Array.isArray(value) ? value : [value];
  const articleKeyPathValue = pathSegments
    .filter((segment): segment is string => typeof segment === 'string')
    .join('/');

  if (!articleKeyPathValue) {
    throw createError({ statusCode: 404, message: '文章不存在' });
  }

  return normalizeArticleKeyPath(articleKeyPathValue);
}
</script>

<template>
  <LayoutPageShell v-if="post" narrow>
    <div class="article-navigation">
      <NuxtLink class="back-link" :to="postsPath(localeCode)">
        ← {{ messages.article.allPosts }}
      </NuxtLink>

      <NavigationLocaleLinks
        v-if="localeLinks.length > 1"
        :links="localeLinks"
        :current-locale-code="localeCode"
        label="Language / 语言"
      />
    </div>

    <article data-pagefind-body>
      <header class="article-header">
        <h1
          :data-article-key-path="articleKeyPath"
          :data-locale="localeCode"
          data-pagefind-meta="title, articleKeyPath[data-article-key-path], locale[data-locale]"
        >
          {{ post.title }}
        </h1>
        <p data-pagefind-meta="description">{{ post.description }}</p>
        <p>
          <time
            :datetime="toDateTime(post.publishedAt)"
            data-pagefind-meta="publishedAt[datetime]"
            data-pagefind-sort="publishedAt[datetime]"
          >
            {{ formatPostDate(post.publishedAt, localeCode) }}
          </time>
          <template v-if="post.updatedAt">
            · {{ messages.article.updated }}
            <time :datetime="toDateTime(post.updatedAt)">
              {{ formatPostDate(post.updatedAt, localeCode) }}
            </time>
          </template>
        </p>
        <ul v-if="postTags.length" class="article-tags" :aria-label="messages.article.tags">
          <li
            v-for="tag in postTags"
            :key="tag"
            :data-tag="tag"
            data-pagefind-filter="tag[data-tag]"
          >
            #{{ tag }}
          </li>
        </ul>
      </header>

      <ContentRenderer class="article-content" :value="post" />
    </article>
  </LayoutPageShell>
</template>

<style scoped>
.article-navigation {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.back-link {
  color: var(--signal);
}

.article-header {
  margin: 4rem 0;
}

.article-header h1 {
  margin: 0.25rem 0 1rem;
  font-family: var(--font-serif);
  font-size: clamp(2.8rem, 8vw, 5.5rem);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.06em;
}

.article-header p {
  color: var(--muted);
  font-size: 1.1rem;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  margin: 1rem 0 0;
  padding: 0;
  color: var(--muted);
  font-size: 0.8rem;
  list-style: none;
}

.article-content {
  font-family: var(--font-serif);
  font-size: 1.08rem;
  line-height: 1.85;
}

/* Nuxt Content 生成的正文元素位于子组件中，必须使用 :deep() 才能应用文章排版。 */
.article-content :deep(pre),
.article-content :deep(code) {
  font-family: var(--font-mono);
}

.article-content :deep(pre) {
  overflow-x: auto;
  padding: 1.25rem;
  color: #e5e1d5;
  background: #292b26;
}

@media (max-width: 36rem) {
  .article-navigation {
    flex-direction: column;
  }
}
</style>
