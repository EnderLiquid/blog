import type { PostSource } from '../content/post-source.ts';
import {
  isArticleDeliveryPageResource,
  type ArticleDeliveryPageResource,
  type ArticlePageResource,
  type SiteManifest,
} from './model.ts';
import { articleResourceId } from './resource-ids.ts';

export interface SiteBuildContext {
  manifest: SiteManifest;
  postSourcesByResourceId: ReadonlyMap<string, PostSource>;
}

/** 建立资源拓扑与原始文章来源的构建期关联；一个来源可以被多个投递页面消费。 */
export function createSiteBuildContext(
  manifest: SiteManifest,
  posts: readonly PostSource[],
): SiteBuildContext {
  const postSourcesByResourceId = new Map<string, PostSource>();
  const errors: string[] = [];

  for (const post of posts) {
    if (post.metadata.draft) {
      continue;
    }

    const resourceId = articleResourceId(post.articleKeyPath, post.localeCode);

    if (postSourcesByResourceId.has(resourceId)) {
      errors.push(`${post.sourcePath}: 文章来源重复映射到资源“${resourceId}”`);
    }

    postSourcesByResourceId.set(resourceId, post);
  }

  const articleResources = manifest.resources.filter(isArticleDeliveryPageResource);
  const realArticleResourceIds = new Set(
    articleResources
      .filter((resource): resource is ArticlePageResource => resource.kind === 'article-page')
      .map((resource) => resource.id),
  );

  for (const resource of articleResources) {
    const sourceResourceId =
      resource.kind === 'article-page' ? resource.id : resource.sourceResourceId;

    if (!postSourcesByResourceId.has(sourceResourceId)) {
      errors.push(`${resource.id}: 找不到对应的非草稿文章来源“${sourceResourceId}”`);
    }

    if (
      resource.kind === 'article-fallback-page' &&
      !realArticleResourceIds.has(resource.sourceResourceId)
    ) {
      errors.push(`${resource.id}: 回退资源来源不是Manifest中的真实文章资源`);
    }
  }

  for (const [resourceId, post] of postSourcesByResourceId) {
    if (!realArticleResourceIds.has(resourceId)) {
      errors.push(`${post.sourcePath}: 非草稿文章来源没有对应真实Manifest资源“${resourceId}”`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`站点构建上下文校验失败：\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }

  return {
    manifest,
    postSourcesByResourceId,
  };
}

export function findPostSource(
  context: SiteBuildContext,
  resource: ArticleDeliveryPageResource,
): PostSource {
  const sourceResourceId =
    resource.kind === 'article-page' ? resource.id : resource.sourceResourceId;
  const post = context.postSourcesByResourceId.get(sourceResourceId);

  if (!post) {
    throw new Error(`${resource.id}: 构建上下文缺少文章来源“${sourceResourceId}”`);
  }

  return post;
}
