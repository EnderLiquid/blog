<script setup lang="ts">
import { formatPostDate, toDateTime } from '~/utils/date';
import { postContentPath } from '~~/shared/content/post-paths';
import { normalizeArticleKeyPath } from '~~/shared/routing/localized-routes';

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

const postTags = computed(() => post.value?.tags ?? []);

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

    <!-- 评论区位于Pagefind正文边界之外，避免第三方界面文案进入文章搜索索引。 -->
    <CommentsArticleComments :article-key-path="articleKeyPath" />
  </LayoutPageShell>
</template>

<style scoped>
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
</style>
