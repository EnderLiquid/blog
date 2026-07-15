import { LOCALE_DEFINITIONS, type LocaleCode } from '../i18n/locales.ts';
import { SITE_METADATA } from '../site/config.ts';
import {
  isPageResource,
  type ArticlePageResource,
  type LocalizationGroup,
  type MachineResource,
  type PageResource,
  type SiteManifest,
  type SiteResource,
} from './model.ts';

export interface LocalizedAlternateView {
  localeCode: LocaleCode | 'x-default';
  url: string;
}

export interface FeedDiscoveryView {
  localeCode: LocaleCode;
  title: string;
  url: string;
}

export interface PageSeoDescriptor {
  path: string;
  title: string;
  description: string;
  indexability: 'index' | 'noindex';
  canonicalUrl?: string;
  languageAlternates: LocalizedAlternateView[];
  feeds: FeedDiscoveryView[];
}

export type PageSeoIndexView = Record<string, PageSeoDescriptor>;

export interface SitemapEntryView {
  url: string;
  lastModified?: string;
  languageAlternates: LocalizedAlternateView[];
}

export interface RssItemView {
  articleKeyPath: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  updatedAt?: string;
  tags: string[];
}

export interface RssChannelView {
  localeCode: LocaleCode;
  title: string;
  description: string;
  homeUrl: string;
  selfUrl: string;
  items: RssItemView[];
}

export interface RobotsView {
  sitemapUrl: string;
}

export function createPrerenderRoutesView(manifest: SiteManifest): string[] {
  return manifest.resources.map((resource) => resource.path);
}

export function createPageSeoIndexView(manifest: SiteManifest): PageSeoIndexView {
  return Object.fromEntries(
    manifest.resources
      .filter(isPageResource)
      .map((resource) => [resource.path, createPageSeoView(manifest, resource)]),
  );
}

export function createPageSeoView(
  manifest: SiteManifest,
  resourceOrPath: PageResource | string,
): PageSeoDescriptor {
  const resource =
    typeof resourceOrPath === 'string' ? findPageByPath(manifest, resourceOrPath) : resourceOrPath;

  return {
    path: resource.path,
    title: resource.title,
    description: resource.description,
    indexability: resource.indexability,
    canonicalUrl:
      resource.kind === 'static-page' && resource.pageId === 'not-found'
        ? undefined
        : absoluteManifestUrl(manifest, resource.path),
    languageAlternates: createLocalizedAlternatesView(manifest, resource),
    feeds: createFeedDiscoveryView(manifest, resource),
  };
}

/** 页面head和Sitemap共同使用的唯一多语言关系投影。 */
export function createLocalizedAlternatesView(
  manifest: SiteManifest,
  resource: PageResource,
): LocalizedAlternateView[] {
  const group = findLocalizationGroupForPage(manifest, resource);

  if (!group) {
    return [];
  }

  const resourceById = createResourceById(manifest);
  const languageAlternates = group.memberResourceIds.map((memberId) => {
    const member = resourceById.get(memberId);

    if (!member || !isPageResource(member) || !member.localeCode) {
      throw new Error(`${group.id}: 无法为成员“${memberId}”生成语言alternate`);
    }

    return {
      localeCode: member.localeCode,
      url: absoluteManifestUrl(manifest, member.path),
    };
  });

  return [
    ...languageAlternates,
    {
      localeCode: 'x-default',
      url: absoluteManifestUrl(manifest, group.xDefaultPath),
    },
  ];
}

export function createSitemapView(manifest: SiteManifest): SitemapEntryView[] {
  return manifest.resources
    .filter(
      (resource): resource is PageResource =>
        isPageResource(resource) && resource.indexability === 'index',
    )
    .map((resource) => ({
      url: absoluteManifestUrl(manifest, resource.path),
      lastModified:
        resource.kind === 'article-page' ? (resource.updatedAt ?? resource.publishedAt) : undefined,
      languageAlternates: createLocalizedAlternatesView(manifest, resource),
    }));
}

export function createRssView(manifest: SiteManifest, localeCode: LocaleCode): RssChannelView {
  const feedResource = findMachineResource(manifest, 'rss', localeCode);
  const homeResource = manifest.resources.find(
    (resource) =>
      resource.kind === 'static-page' &&
      resource.pageId === 'home' &&
      resource.localeCode === localeCode,
  );
  const localeDefinition = LOCALE_DEFINITIONS.find((definition) => definition.code === localeCode);

  if (!homeResource || !localeDefinition) {
    throw new Error(`无法为语言${localeCode}生成RSS视图`);
  }

  const items = manifest.resources
    .filter(
      (resource): resource is ArticlePageResource =>
        resource.kind === 'article-page' && resource.localeCode === localeCode,
    )
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .map((resource) => ({
      articleKeyPath: resource.articleKeyPath,
      title: resource.title,
      description: resource.description,
      url: absoluteManifestUrl(manifest, resource.path),
      publishedAt: resource.publishedAt,
      updatedAt: resource.updatedAt,
      tags: resource.tags,
    }));

  return {
    localeCode,
    title: `${SITE_METADATA[localeCode].title} · ${localeDefinition.label}`,
    description: SITE_METADATA[localeCode].description,
    homeUrl: absoluteManifestUrl(manifest, homeResource.path),
    selfUrl: absoluteManifestUrl(manifest, feedResource.path),
    items,
  };
}

export function createRobotsView(manifest: SiteManifest): RobotsView {
  const sitemapResource = findMachineResource(manifest, 'sitemap');
  return {
    sitemapUrl: absoluteManifestUrl(manifest, sitemapResource.path),
  };
}

function createFeedDiscoveryView(
  manifest: SiteManifest,
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
    const feedResource = findMachineResource(manifest, 'rss', localeCode);
    const localeDefinition = LOCALE_DEFINITIONS.find(
      (definition) => definition.code === localeCode,
    );

    if (!localeDefinition) {
      throw new Error(`语言注册表缺少${localeCode}`);
    }

    return {
      localeCode,
      title: `${SITE_METADATA[localeCode].title} · ${localeDefinition.label}`,
      url: absoluteManifestUrl(manifest, feedResource.path),
    };
  });
}

function findLocalizationGroupForPage(
  manifest: SiteManifest,
  resource: PageResource,
): LocalizationGroup | undefined {
  if (resource.localizationGroupId) {
    return manifest.localizationGroups.find((group) => group.id === resource.localizationGroupId);
  }

  // 语言中立根入口是首页组的x-default，但不是某个具体语言成员。
  if (resource.kind === 'static-page' && resource.pageId === 'root') {
    return manifest.localizationGroups.find((group) => group.xDefaultPath === resource.path);
  }

  return undefined;
}

function findPageByPath(manifest: SiteManifest, path: string): PageResource {
  const resource = manifest.resources.find(
    (candidate) => candidate.path === path && isPageResource(candidate),
  );

  if (!resource || !isPageResource(resource)) {
    throw new Error(`清单中找不到页面：“${path}”`);
  }

  return resource;
}

function findMachineResource(
  manifest: SiteManifest,
  machineType: MachineResource['machineType'],
  localeCode?: LocaleCode,
): MachineResource {
  const resource = manifest.resources.find(
    (candidate): candidate is MachineResource =>
      candidate.kind === 'machine' &&
      candidate.machineType === machineType &&
      candidate.localeCode === localeCode,
  );

  if (!resource) {
    throw new Error(`清单中找不到机器资源：${machineType}${localeCode ? `:${localeCode}` : ''}`);
  }

  return resource;
}

function createResourceById(manifest: SiteManifest): Map<string, SiteResource> {
  return new Map(manifest.resources.map((resource) => [resource.id, resource]));
}

function absoluteManifestUrl(manifest: SiteManifest, path: string): string {
  return new URL(path, manifest.siteOrigin).toString();
}
