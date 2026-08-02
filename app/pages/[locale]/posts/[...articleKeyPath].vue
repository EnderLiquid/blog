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

        <div class="article-header__register">
          <p class="article-header__dates">
            <time
              :datetime="toDateTime(post.publishedAt)"
              data-pagefind-meta="publishedAt[datetime]"
              data-pagefind-sort="publishedAt[datetime]"
            >
              {{ formatPostDate(post.publishedAt, localeCode) }}
            </time>
            <span v-if="post.updatedAt" class="article-header__updated">
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

article {
  container-type: inline-size;
  container-name: article;
}

.article-header {
  display: grid;
  grid-template-areas: 'register copy';
  grid-template-columns: minmax(6.25rem, 8rem) minmax(0, 1fr);
  gap: clamp(1.5rem, 5cqi, 3.5rem);
  margin: clamp(2.75rem, 7cqi, 4.75rem) 0 clamp(3rem, 7cqi, 4.75rem);
  padding-bottom: clamp(1.25rem, 3cqi, 1.75rem);
  border-bottom: 1px solid var(--line);
}

.article-header__copy {
  min-width: 0;
  grid-area: copy;
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

.article-header__register {
  align-self: start;
  min-width: 0;
  padding: 0.15rem 0 0 0.85rem;
  border-left: 2px solid var(--signal);
  grid-area: register;
}

.article-header__dates {
  display: grid;
  gap: 0.65rem;
  margin: 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.article-header__updated {
  display: grid;
  gap: 0.15rem;
}

.article-tags {
  display: grid;
  gap: 0.35rem;
  margin: 1.1rem 0 0;
  padding: 0.85rem 0 0;
  border-top: 1px dotted var(--line);
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.45;
  list-style: none;
}

.article-tags li {
  overflow-wrap: anywhere;
}

@container article (max-width: 34rem) {
  .article-header {
    grid-template-areas:
      'copy'
      'register';
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
  }

  .article-header h1 {
    font-size: clamp(2.7rem, 14cqi, 3.9rem);
  }

  .article-header__register {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem 1.5rem;
    align-items: start;
    padding: 0;
    border: 0;
  }

  .article-header__dates {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 1rem;
  }

  .article-header__updated {
    display: flex;
    gap: 0.3rem;
  }

  .article-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.75rem;
    margin: 0;
    padding: 0;
    border: 0;
  }
}
</style>
