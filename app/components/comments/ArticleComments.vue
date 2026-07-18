<script setup lang="ts">
import Giscus from '@giscus/vue';
import {
  createArticleDiscussionTerm,
  GISCUS_CONFIG,
  toGiscusLanguage,
} from '~~/shared/comments/giscus';

const props = defineProps<{
  articleKeyPath: string;
}>();

const { localeCode, messages } = useSiteLocale();
const requestUrl = useRequestURL();
const discussionTerm = computed(() => createArticleDiscussionTerm(props.articleKeyPath));
const giscusLanguage = computed(() => toGiscusLanguage(localeCode.value));

/**
 * 开发环境直接从Nuxt本地服务器读取主题，以便修改CSS后刷新即可预览。
 * 生产构建继续使用稳定的公开地址，供giscus.app跨域加载。
 */
const giscusTheme = computed(() =>
  import.meta.dev ? new URL('/giscus-theme.css', requestUrl.origin).href : GISCUS_CONFIG.theme,
);

// 切换语言时重新创建组件，确保iframe中的界面语言与当前URL保持一致。
const widgetKey = computed(() => `${discussionTerm.value}:${giscusLanguage.value}`);
</script>

<template>
  <section class="article-comments" aria-labelledby="article-comments-title">
    <header class="article-comments__header">
      <h2 id="article-comments-title">{{ messages.comments.title }}</h2>
    </header>

    <ClientOnly>
      <Giscus
        :key="widgetKey"
        id="article-comments-widget"
        :repo="GISCUS_CONFIG.repo"
        :repo-id="GISCUS_CONFIG.repoId"
        :category="GISCUS_CONFIG.category"
        :category-id="GISCUS_CONFIG.categoryId"
        :mapping="GISCUS_CONFIG.mapping"
        :term="discussionTerm"
        :strict="GISCUS_CONFIG.strict"
        :reactions-enabled="GISCUS_CONFIG.reactionsEnabled"
        :emit-metadata="GISCUS_CONFIG.emitMetadata"
        :input-position="GISCUS_CONFIG.inputPosition"
        :theme="giscusTheme"
        :lang="giscusLanguage"
        :loading="GISCUS_CONFIG.loading"
      />

      <template #fallback>
        <p class="article-comments__loading" aria-live="polite">
          {{ messages.comments.loading }}
        </p>
      </template>
    </ClientOnly>
  </section>
</template>

<style scoped>
.article-comments {
  margin-top: 5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--line);
}

.article-comments__header {
  margin-bottom: 1.5rem;
}

.article-comments__header h2 {
  margin: 0 0 0.5rem;
  font-family: var(--font-serif);
  font-size: clamp(1.8rem, 5vw, 2.5rem);
  font-weight: 400;
}

.article-comments__loading {
  margin: 0;
  color: var(--muted);
}
</style>
