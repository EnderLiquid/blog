import { postContentPath } from '../content/post-paths.ts';
import { findPostSource, type SiteBuildContext } from '../site-manifest/context.ts';
import {
  isArticleDeliveryPageResource,
  type ArticleDeliveryPageResource,
} from '../site-manifest/model.ts';
import type { ArticleDeliveryIndexView } from './model.ts';

/**
 * 将文章公开投递路径映射到真实Markdown来源。
 *
 * 该投影同时服务文章加载、列表链接和语言导航；它不包含SEO metadata，避免页面
 * 运行时通过canonical反推正文来源。
 */
export function createArticleDeliveryIndexView(
  context: SiteBuildContext,
): ArticleDeliveryIndexView {
  return Object.fromEntries(
    context.manifest.resources
      .filter(isArticleDeliveryPageResource)
      .map((resource) => [resource.path, createArticleDeliveryDescriptor(context, resource)]),
  );
}

function createArticleDeliveryDescriptor(
  context: SiteBuildContext,
  resource: ArticleDeliveryPageResource,
) {
  const post = findPostSource(context, resource);

  return {
    path: resource.path,
    articleKeyPath: resource.articleKeyPath,
    interfaceLocaleCode: resource.localeCode,
    contentLocaleCode: post.localeCode,
    contentPath: postContentPath(resource.articleKeyPath, post.localeCode),
    fallback: resource.kind === 'article-fallback-page',
  };
}
