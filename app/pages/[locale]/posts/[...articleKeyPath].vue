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
    <article
      :lang="delivery.contentLocaleCode"
      :data-pagefind-body="delivery.fallback ? undefined : ''"
    >
      <header class="article-header">
        <p v-if="delivery.fallback" class="article-header__fallback" role="note">
          {{ messages.article.fallbackLanguage(contentLanguageLabel) }}
        </p>
        <div class="article-header__metadata">
          <p class="article-header__dates">
            <time
              :datetime="toDateTime(post.publishedAt)"
              data-pagefind-meta="publishedAt[datetime]"
              data-pagefind-sort="publishedAt[datetime]"
            >
              {{ formatPostDate(post.publishedAt, localeCode) }}
            </time>
            <span v-if="post.updatedAt" class="article-header__updated">
              <span class="article-header__separator" aria-hidden="true">·</span>
              <span>{{ messages.article.updated }}</span>
              <time :datetime="toDateTime(post.updatedAt)">
                {{ formatPostDate(post.updatedAt, localeCode) }}
              </time>
            </span>
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
        </div>

        <div class="article-header__copy">
          <h1
            :data-article-key-path="delivery.articleKeyPath"
            :data-locale="delivery.contentLocaleCode"
            data-pagefind-meta="title, articleKeyPath[data-article-key-path], locale[data-locale]"
          >
            {{ post.title }}
          </h1>
          <p class="article-header__description" data-pagefind-meta="description">
            {{ post.description }}
          </p>
        </div>
      </header>

      <ArticleBody class="article-content" :value="post" />
    </article>

    <!-- 评论区位于Pagefind正文边界之外，避免第三方界面文案进入文章搜索索引。 -->
    <CommentsArticleComments :article-key-path="delivery.articleKeyPath" />
  </LayoutPageShell>
</template>

<style scoped>
.article-header__fallback {
  margin: 0 0 0.65rem;
  color: var(--signal);
  font-size: 0.78rem;
  line-height: 1.45;
}

article {
  container-type: inline-size;
  container-name: article;
}

.article-header {
  margin: clamp(2.75rem, 7cqi, 4.75rem) 0 clamp(3rem, 7cqi, 4.75rem);
  padding: clamp(0.75rem, 1.5cqi, 1rem) 0 clamp(0.75rem, 1.5cqi, 1rem) clamp(1.5rem, 5cqi, 3rem);
  border-left: 2px solid var(--signal);
}

.article-header__metadata {
  display: flex;
  flex-wrap: wrap;
  row-gap: clamp(0.65rem, 1.5cqi, 0.9rem);
  column-gap: 0.65rem;
  align-items: center;
  min-width: 0;
}

.article-header__copy {
  min-width: 0;
  margin-top: clamp(1rem, 2.25cqi, 1.5rem);
}

.article-header h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(3rem, 9cqi, 4.75rem);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.06em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.article-header__description {
  max-width: 35rem;
  margin: 1rem 0 0;
  color: var(--muted);
  font-family: var(--font-serif);
  font-size: 1.1rem;
  line-height: 1.6;
}

.article-header__dates {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6em;
  margin: 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.article-header__updated {
  display: flex;
  gap: 0.6em;
}

.article-tags {
  display: flex;
  flex: 0 1 max-content;
  flex-wrap: wrap;
  gap: 0.2rem 0.4rem;
  max-width: 100%;
  margin: 0;
  padding: 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.45;
  list-style: none;
}

.article-tags li {
  padding: 0.18rem 0.4rem;
  overflow-wrap: anywhere;
  background: color-mix(in srgb, var(--ink) 4%, transparent);
}

@container article (max-width: 34rem) {
  .article-header h1 {
    font-size: clamp(2.7rem, 14cqi, 3.9rem);
  }
}
</style>
