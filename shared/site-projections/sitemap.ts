import { resolveStaticPageSeo } from '../site-definitions/page-seo.ts';
import { findPostSource, type SiteBuildContext } from '../site-manifest/context.ts';
import { isPageResource, type PageResource } from '../site-manifest/model.ts';
import { absoluteManifestUrl, createLocalizedAlternates } from '../site-manifest/relations.ts';
import type { SitemapProjectionView } from './model.ts';

export function createSitemapView(context: SiteBuildContext): SitemapProjectionView {
  return context.manifest.resources
    .filter(isPageResource)
    .filter((resource) => isIndexable(resource))
    .map((resource) => ({
      url: absoluteManifestUrl(context.manifest, resource.path),
      lastModified: resolveLastModified(context, resource),
      languageAlternates: createLocalizedAlternates(context.manifest, resource),
    }));
}

function isIndexable(resource: PageResource): boolean {
  return (
    resource.kind === 'article-page' ||
    resolveStaticPageSeo(resource.pageId, resource.localeCode).indexability === 'index'
  );
}

function resolveLastModified(
  context: SiteBuildContext,
  resource: PageResource,
): string | undefined {
  if (resource.kind !== 'article-page') {
    return undefined;
  }

  const post = findPostSource(context, resource);
  return (post.metadata.updatedAt ?? post.metadata.publishedAt).toISOString();
}
