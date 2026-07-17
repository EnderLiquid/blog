import { LOCALE_DEFINITIONS, type LocaleCode } from '../i18n/locales.ts';
import { RSS_FEED_DEFINITIONS, RSS_ITEM_GUID_PREFIX } from '../site-definitions/rss.ts';
import { findPostSource, type SiteBuildContext } from '../site-manifest/context.ts';
import type { ArticlePageResource } from '../site-manifest/model.ts';
import {
  absoluteManifestUrl,
  findMachineResource,
  findStaticPageResource,
} from '../site-manifest/relations.ts';
import type { RssChannelView, RssProjectionView } from './model.ts';

export function createRssProjectionView(context: SiteBuildContext): RssProjectionView {
  return LOCALE_DEFINITIONS.map(({ code }) => createRssView(context, code));
}

export function createRssView(context: SiteBuildContext, localeCode: LocaleCode): RssChannelView {
  const feedResource = findMachineResource(context.manifest, 'rss', localeCode);
  const homeResource = findStaticPageResource(context.manifest, 'home', localeCode);
  const feedDefinition = RSS_FEED_DEFINITIONS[localeCode];
  const items = context.manifest.resources
    .filter(
      (resource): resource is ArticlePageResource =>
        resource.kind === 'article-page' && resource.localeCode === localeCode,
    )
    .map((resource) => ({ resource, post: findPostSource(context, resource) }))
    .sort(
      (left, right) =>
        right.post.metadata.publishedAt.getTime() - left.post.metadata.publishedAt.getTime() ||
        left.resource.articleKeyPath.localeCompare(right.resource.articleKeyPath),
    )
    .map(({ resource, post }) => ({
      articleKeyPath: resource.articleKeyPath,
      guid: createRssItemGuid(resource.localeCode, resource.articleKeyPath),
      // RSS当前有意复用文章唯一标题与摘要；不通过Manifest共享通用字段。
      title: post.metadata.title,
      description: post.metadata.description,
      url: absoluteManifestUrl(context.manifest, resource.path),
      publishedAt: post.metadata.publishedAt.toISOString(),
      updatedAt: post.metadata.updatedAt?.toISOString(),
      tags: [...post.metadata.tags].sort(),
    }));

  return {
    localeCode,
    title: feedDefinition.title,
    description: feedDefinition.description,
    homeUrl: absoluteManifestUrl(context.manifest, homeResource.path),
    selfUrl: absoluteManifestUrl(context.manifest, feedResource.path),
    items,
  };
}

/** 使用稳定文章身份生成域名无关GUID；语言版本是不同的订阅条目。 */
export function createRssItemGuid(localeCode: LocaleCode, articleKeyPath: string): string {
  return `${RSS_ITEM_GUID_PREFIX}:${localeCode}:${articleKeyPath}`;
}
