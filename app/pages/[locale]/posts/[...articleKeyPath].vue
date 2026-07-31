<script setup lang="ts">
import ArticleBody from '~/components/article/ArticleBody.vue';
import { formatPostDate, toDateTime } from '~/utils/date';

const { localeCode, messages } = useSiteLocale();
const { descriptor } = useArticleDeliveryDescriptor();
const delivery = descriptor.value;

if (!delivery || delivery.interfaceLocaleCode !== localeCode.value) {
  throw createError({
    statusCode: 404,
    message: messages.value.notFound.title,
  });
}

const { data: post } = await useAsyncData(`post:${delivery.path}`, () =>
  queryCollection('posts').path(delivery.contentPath).first(),
);

if (!post.value || post.value.draft) {
  throw createError({
    statusCode: 404,
    message: messages.value.notFound.title,
  });
}

const postTags = computed(() => post.value?.tags ?? []);
const contentLanguageLabel = computed(() => {
  const displayNames = new Intl.DisplayNames([localeCode.value], { type: 'language' });
  return displayNames.of(delivery.contentLocaleCode) ?? delivery.contentLocaleCode;
});
</script>

<template>
  <LayoutPageShell v-if="post" narrow>
    <p v-if="delivery.fallback" class="article-fallback" role="note">
      {{ messages.article.fallbackLanguage(contentLanguageLabel) }}
    </p>

    <article
      :lang="delivery.contentLocaleCode"
      :data-pagefind-body="delivery.fallback ? undefined : ''"
    >
      <header class="article-header">
        <h1
          :data-article-key-path="delivery.articleKeyPath"
          :data-locale="delivery.contentLocaleCode"
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

      <ArticleBody class="article-content" :value="post" />
    </article>

    <!-- 评论区位于Pagefind正文边界之外，避免第三方界面文案进入文章搜索索引。 -->
    <CommentsArticleComments :article-key-path="delivery.articleKeyPath" />
  </LayoutPageShell>
</template>

<style scoped>
.article-fallback {
  margin: 2rem 0 -2rem;
  padding: 0.75rem 1rem;
  color: var(--muted);
  border-left: 2px solid var(--signal);
  background: color-mix(in srgb, var(--ink) 3%, transparent);
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
</style>
