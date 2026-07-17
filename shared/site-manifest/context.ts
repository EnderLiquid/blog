import type { PostSource } from '../content/post-source.ts';
import type { ArticlePageResource, SiteManifest } from './model.ts';
import { articleResourceId } from './resource-ids.ts';

export interface SiteBuildContext {
  manifest: SiteManifest;
  postSourcesByResourceId: ReadonlyMap<string, PostSource>;
}

/** 建立拓扑资源与原始文章来源的一对一构建期关联。 */
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

  const articleResources = manifest.resources.filter(
    (resource): resource is ArticlePageResource => resource.kind === 'article-page',
  );
  const articleResourceIds = new Set(articleResources.map((resource) => resource.id));

  for (const resource of articleResources) {
    if (!postSourcesByResourceId.has(resource.id)) {
      errors.push(`${resource.id}: 找不到对应的非草稿文章来源`);
    }
  }

  for (const [resourceId, post] of postSourcesByResourceId) {
    if (!articleResourceIds.has(resourceId)) {
      errors.push(`${post.sourcePath}: 非草稿文章来源没有对应Manifest资源“${resourceId}”`);
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
  resource: ArticlePageResource,
): PostSource {
  const post = context.postSourcesByResourceId.get(resource.id);

  if (!post) {
    throw new Error(`${resource.id}: 构建上下文缺少文章来源`);
  }

  return post;
}
