import type { PostSource } from '../content/post-source.ts';
import { ARTICLE_SEGMENT_PATTERN } from '../content/post-schema.ts';

export const MAX_FEATURED_ARTICLES = 3;

/** 首页只保存逻辑文章身份；标题、摘要、日期和投递语言仍来自文章源。 */
export const FEATURED_ARTICLE_KEYS = ['examples/hello-world'] as const;

/** 在构建入口校验首页展示配置，不把展示顺序写入拓扑Manifest。 */
export function validateFeaturedArticleKeys(
  articleKeys: readonly string[],
  postSources: readonly PostSource[],
): void {
  if (articleKeys.length > MAX_FEATURED_ARTICLES) {
    throw new Error(
      `首页精选文章最多配置${MAX_FEATURED_ARTICLES}篇，当前为${articleKeys.length}篇`,
    );
  }

  const seenArticleKeys = new Set<string>();

  for (const articleKeyPath of articleKeys) {
    if (seenArticleKeys.has(articleKeyPath)) {
      throw new Error(`首页精选文章重复配置：${articleKeyPath}`);
    }
    seenArticleKeys.add(articleKeyPath);

    const segments = articleKeyPath.split('/');
    if (
      segments.some((segment) => segment.length === 0 || !ARTICLE_SEGMENT_PATTERN.test(segment))
    ) {
      throw new Error(`首页精选文章路径不合法：${articleKeyPath}`);
    }

    const matchingSources = postSources.filter(
      (postSource) => postSource.articleKeyPath === articleKeyPath,
    );
    if (matchingSources.length === 0) {
      throw new Error(`首页精选文章不存在：${articleKeyPath}`);
    }
    if (matchingSources.every((postSource) => postSource.metadata.draft)) {
      throw new Error(`首页精选文章不能只包含草稿来源：${articleKeyPath}`);
    }
  }
}
