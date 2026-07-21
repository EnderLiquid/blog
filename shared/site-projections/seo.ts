import { LOCALE_DEFINITIONS } from '../i18n/locales.ts';
import { resolveStaticPageSeo } from '../site-definitions/page-seo.ts';
import { RSS_FEED_DEFINITIONS } from '../site-definitions/rss.ts';
import { findPostSource, type SiteBuildContext } from '../site-manifest/context.ts';
import {
  isPageResource,
  type ArticleDeliveryPageResource,
  type PageResource,
} from '../site-manifest/model.ts';
import {
  absoluteManifestUrl,
  createLocalizedAlternates,
  findCanonicalArticleResource,
  findMachineResource,
} from '../site-manifest/relations.ts';
import type { FeedDiscoveryView, PageSeoDescriptor, PageSeoIndexView } from './model.ts';

export function createPageSeoIndexView(context: SiteBuildContext): PageSeoIndexView {
  return Object.fromEntries(
    context.manifest.resources
      .filter(isPageResource)
      .map((resource) => [resource.path, createPageSeoView(context, resource)]),
  );
}

export function createPageSeoView(
  context: SiteBuildContext,
  resource: PageResource,
): PageSeoDescriptor {
  const metadata =
    resource.kind === 'static-page'
      ? resolveStaticPageSeo(resource.pageId, resource.localeCode)
      : resolveArticleSeo(context, resource);

  return {
    path: resource.path,
    title: metadata.title,
    description: metadata.description,
    indexability: metadata.indexability,
    canonicalUrl: createCanonicalUrl(context, resource),
    languageAlternates: createLocalizedAlternates(context.manifest, resource),
    feeds: createFeedDiscoveryView(context, resource),
  };
}

function resolveArticleSeo(
  context: SiteBuildContext,
  resource: ArticleDeliveryPageResource,
): Pick<PageSeoDescriptor, 'title' | 'description' | 'indexability'> {
  const post = findPostSource(context, resource);

  // 文章title与description是当前唯一编辑来源；SEO在此明确复用，不经Manifest中转。
  return {
    title: post.metadata.title,
    description: post.metadata.description,
    indexability: resource.kind === 'article-page' ? 'index' : 'noindex',
  };
}

function createCanonicalUrl(context: SiteBuildContext, resource: PageResource): string | undefined {
  if (resource.kind === 'static-page' && resource.pageId === 'not-found') {
    return undefined;
  }

  if (resource.kind === 'article-fallback-page') {
    const canonicalResource = findCanonicalArticleResource(context.manifest, resource);
    return absoluteManifestUrl(context.manifest, canonicalResource.path);
  }

  return absoluteManifestUrl(context.manifest, resource.path);
}

function createFeedDiscoveryView(
  context: SiteBuildContext,
  resource: PageResource,
): FeedDiscoveryView[] {
  if (resource.kind === 'static-page' && resource.pageId === 'not-found') {
    return [];
  }

  const localeCodes = resource.localeCode
    ? [resource.localeCode]
    : resource.kind === 'static-page' && resource.pageId === 'root'
      ? LOCALE_DEFINITIONS.map((definition) => definition.code)
      : [];

  return localeCodes.map((localeCode) => {
    const feedResource = findMachineResource(context.manifest, 'rss', localeCode);

    return {
      localeCode,
      title: RSS_FEED_DEFINITIONS[localeCode].title,
      url: absoluteManifestUrl(context.manifest, feedResource.path),
    };
  });
}
