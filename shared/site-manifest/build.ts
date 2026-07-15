import type { PostMetadata } from '../content/post-schema.ts';
import { DEFAULT_LOCALE_CODE, LOCALE_DEFINITIONS, type LocaleCode } from '../i18n/locales.ts';
import { articlePath, ROBOTS_PATH, rssPath, SITEMAP_PATH } from '../routing/localized-routes.ts';
import { SITE_ORIGIN } from '../site/config.ts';
import {
  SITE_MANIFEST_VERSION,
  isPageResource,
  parseSiteManifest,
  type ArticlePageResource,
  type LocalizationGroup,
  type MachineResource,
  type SiteManifest,
  type SiteResource,
  type StaticPageResource,
} from './model.ts';
import { STATIC_PAGE_DEFINITIONS, type LocalizedStaticPageDefinition } from './static-pages.ts';

export interface PostSource {
  sourcePath: string;
  articleKeyPath: string;
  localeCode: LocaleCode;
  metadata: PostMetadata;
}

export interface BuildSiteManifestInput {
  posts: readonly PostSource[];
  siteOrigin?: string;
}

/** 将所有构建期来源展开为具体、稳定且经过完整校验的站点资源清单。 */
export function buildSiteManifest(input: BuildSiteManifestInput): SiteManifest {
  validateCrossLocalePostSources(input.posts);

  const staticResult = buildStaticPageResources();
  const articleResult = buildArticlePageResources(input.posts);
  const machineResources = buildMachineResources();

  const manifest: SiteManifest = {
    version: SITE_MANIFEST_VERSION,
    siteOrigin: input.siteOrigin ?? SITE_ORIGIN,
    resources: [...staticResult.resources, ...articleResult.resources, ...machineResources].sort(
      (left, right) => left.path.localeCompare(right.path),
    ),
    localizationGroups: [...staticResult.groups, ...articleResult.groups].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
  };

  return validateSiteManifest(manifest);
}

/** 校验从JSON恢复的清单结构及跨资源语义，并返回类型收窄后的同一对象。 */
export function validateSiteManifest(value: unknown): SiteManifest {
  const manifest = parseSiteManifest(value);
  const errors: string[] = [];
  const resourceById = new Map<string, SiteResource>();
  const resourceByPath = new Map<string, SiteResource>();
  const groupById = new Map<string, LocalizationGroup>();

  validateSiteOrigin(manifest.siteOrigin, errors);

  for (const resource of manifest.resources) {
    if (resourceById.has(resource.id)) {
      errors.push(`资源id重复：“${resource.id}”`);
    }

    if (resourceByPath.has(resource.path)) {
      errors.push(`资源path重复：“${resource.path}”`);
    }

    validateResourcePath(resource, errors);
    resourceById.set(resource.id, resource);
    resourceByPath.set(resource.path, resource);
  }

  for (const group of manifest.localizationGroups) {
    if (groupById.has(group.id)) {
      errors.push(`语言组id重复：“${group.id}”`);
    }

    groupById.set(group.id, group);
    validateLocalizationGroup(group, resourceById, resourceByPath, errors);
  }

  for (const resource of manifest.resources) {
    if (!isPageResource(resource) || !resource.localizationGroupId) {
      continue;
    }

    const group = groupById.get(resource.localizationGroupId);

    if (!group) {
      errors.push(`${resource.id}: 找不到语言组“${resource.localizationGroupId}”`);
    } else if (!group.memberResourceIds.includes(resource.id)) {
      errors.push(`${resource.id}: 语言组“${group.id}”没有反向包含该资源`);
    }
  }

  validateMachineResources(manifest.resources, errors);

  if (errors.length > 0) {
    throw new Error(`站点资源清单校验失败：\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }

  return manifest;
}

function buildStaticPageResources(): {
  resources: StaticPageResource[];
  groups: LocalizationGroup[];
} {
  const resources: StaticPageResource[] = [];
  const groups: LocalizationGroup[] = [];

  for (const definition of STATIC_PAGE_DEFINITIONS) {
    if (!definition.localized) {
      const metadata = definition.metadata();
      resources.push({
        kind: 'static-page',
        id: `page:${definition.pageId}`,
        pageId: definition.pageId,
        path: definition.path(),
        indexability: definition.indexability,
        title: metadata.title,
        description: metadata.description,
      });
      continue;
    }

    const localizedResources = buildLocalizedStaticPageResources(definition);
    resources.push(...localizedResources);
    groups.push({
      id: definition.localizationGroupId,
      memberResourceIds: localizedResources.map((resource) => resource.id),
      xDefaultPath: definition.xDefaultPath(),
    });
  }

  return { resources, groups };
}

function buildLocalizedStaticPageResources(
  definition: LocalizedStaticPageDefinition,
): StaticPageResource[] {
  return LOCALE_DEFINITIONS.map(({ code }) => {
    const metadata = definition.metadata(code);
    return {
      kind: 'static-page',
      id: `page:${definition.pageId}:${code}`,
      pageId: definition.pageId,
      path: definition.path(code),
      localeCode: code,
      indexability: definition.indexability,
      localizationGroupId: definition.localizationGroupId,
      title: metadata.title,
      description: metadata.description,
    };
  });
}

function buildArticlePageResources(posts: readonly PostSource[]): {
  resources: ArticlePageResource[];
  groups: LocalizationGroup[];
} {
  const publishedPosts = posts.filter((post) => !post.metadata.draft);
  const resources = publishedPosts.map<ArticlePageResource>((post) => ({
    kind: 'article-page',
    id: `article:${post.articleKeyPath}:${post.localeCode}`,
    articleKeyPath: post.articleKeyPath,
    path: articlePath(post.localeCode, post.articleKeyPath),
    localeCode: post.localeCode,
    localizationGroupId: `article:${post.articleKeyPath}`,
    indexability: 'index',
    title: post.metadata.title,
    description: post.metadata.description,
    publishedAt: post.metadata.publishedAt.toISOString(),
    updatedAt: post.metadata.updatedAt?.toISOString(),
    tags: [...post.metadata.tags].sort(),
  }));
  const resourcesByArticle = new Map<string, ArticlePageResource[]>();

  for (const resource of resources) {
    const variants = resourcesByArticle.get(resource.articleKeyPath) ?? [];
    variants.push(resource);
    resourcesByArticle.set(resource.articleKeyPath, variants);
  }

  const groups = [...resourcesByArticle.entries()].map<LocalizationGroup>(
    ([articleKeyPath, variants]) => {
      const orderedVariants = LOCALE_DEFINITIONS.flatMap(({ code }) =>
        variants.filter((variant) => variant.localeCode === code),
      );
      const defaultVariant =
        orderedVariants.find((variant) => variant.localeCode === DEFAULT_LOCALE_CODE) ??
        orderedVariants[0];

      if (!defaultVariant) {
        throw new Error(`文章 ${articleKeyPath} 没有可发布语言版本`);
      }

      return {
        id: `article:${articleKeyPath}`,
        memberResourceIds: orderedVariants.map((variant) => variant.id),
        xDefaultPath: defaultVariant.path,
      };
    },
  );

  return { resources, groups };
}

function buildMachineResources(): MachineResource[] {
  return [
    ...LOCALE_DEFINITIONS.map<MachineResource>(({ code }) => ({
      kind: 'machine',
      machineType: 'rss',
      id: `machine:rss:${code}`,
      path: rssPath(code),
      localeCode: code,
    })),
    {
      kind: 'machine',
      machineType: 'sitemap',
      id: 'machine:sitemap',
      path: SITEMAP_PATH,
    },
    {
      kind: 'machine',
      machineType: 'robots',
      id: 'machine:robots',
      path: ROBOTS_PATH,
    },
  ];
}

function validateCrossLocalePostSources(posts: readonly PostSource[]): void {
  const errors: string[] = [];
  const versionsByArticle = new Map<string, PostSource[]>();
  const sourceIds = new Set<string>();

  for (const post of posts) {
    const sourceId = `${post.articleKeyPath}:${post.localeCode}`;

    if (sourceIds.has(sourceId)) {
      errors.push(`${post.sourcePath}: 文章语言版本重复“${sourceId}”`);
    }

    sourceIds.add(sourceId);
    const versions = versionsByArticle.get(post.articleKeyPath) ?? [];
    versions.push(post);
    versionsByArticle.set(post.articleKeyPath, versions);
  }

  for (const [articleKeyPath, versions] of versionsByArticle) {
    const expectedTags = [...(versions[0]?.metadata.tags ?? [])].sort();

    for (const version of versions.slice(1)) {
      const actualTags = [...version.metadata.tags].sort();

      if (!sameValues(expectedTags, actualTags)) {
        errors.push(
          `${articleKeyPath}: 各语言版本的标签必须一致；` +
            `${versions[0]?.sourcePath}为[${expectedTags.join(', ')}]，` +
            `${version.sourcePath}为[${actualTags.join(', ')}]`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`文章来源校验失败：\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }
}

function validateSiteOrigin(siteOrigin: string, errors: string[]): void {
  try {
    const url = new URL(siteOrigin);

    if (url.protocol !== 'https:') {
      errors.push(`siteOrigin必须使用HTTPS：“${siteOrigin}”`);
    }

    if (url.pathname !== '/' || url.search || url.hash) {
      errors.push(`siteOrigin不能包含路径、查询参数或hash：“${siteOrigin}”`);
    }
  } catch {
    errors.push(`siteOrigin不是合法URL：“${siteOrigin}”`);
  }
}

function validateResourcePath(resource: SiteResource, errors: string[]): void {
  if (resource.path.includes('?') || resource.path.includes('#')) {
    errors.push(`${resource.id}: 资源path不能包含查询参数或hash：“${resource.path}”`);
  }

  if (
    isPageResource(resource) &&
    !resource.path.endsWith('/') &&
    !resource.path.endsWith('.html')
  ) {
    errors.push(`${resource.id}: HTML页面path必须以斜杠或.html结尾：“${resource.path}”`);
  }
}

function validateLocalizationGroup(
  group: LocalizationGroup,
  resourceById: ReadonlyMap<string, SiteResource>,
  resourceByPath: ReadonlyMap<string, SiteResource>,
  errors: string[],
): void {
  const locales = new Set<LocaleCode>();

  if (!resourceByPath.has(group.xDefaultPath)) {
    errors.push(`${group.id}: x-default没有对应页面资源：“${group.xDefaultPath}”`);
  }

  for (const memberId of group.memberResourceIds) {
    const resource = resourceById.get(memberId);

    if (!resource || !isPageResource(resource)) {
      errors.push(`${group.id}: 成员不是有效页面资源：“${memberId}”`);
      continue;
    }

    if (!resource.localeCode) {
      errors.push(`${group.id}: 成员缺少localeCode：“${memberId}”`);
      continue;
    }

    if (locales.has(resource.localeCode)) {
      errors.push(`${group.id}: 语言成员重复：“${resource.localeCode}”`);
    }

    locales.add(resource.localeCode);

    if (resource.localizationGroupId !== group.id) {
      errors.push(`${group.id}: 成员“${memberId}”反向指向了其他语言组`);
    }
  }
}

function validateMachineResources(resources: readonly SiteResource[], errors: string[]): void {
  const machineResources = resources.filter(
    (resource): resource is MachineResource => resource.kind === 'machine',
  );

  for (const machineType of ['sitemap', 'robots'] as const) {
    const matches = machineResources.filter((resource) => resource.machineType === machineType);

    if (matches.length !== 1) {
      errors.push(`${machineType}资源必须恰好有一个，当前为${matches.length}个`);
    }
  }

  const rssResources = machineResources.filter((resource) => resource.machineType === 'rss');

  for (const { code } of LOCALE_DEFINITIONS) {
    const matches = rssResources.filter((resource) => resource.localeCode === code);

    if (matches.length !== 1) {
      errors.push(`语言${code}的RSS资源必须恰好有一个，当前为${matches.length}个`);
    }
  }

  const invalidRss = rssResources.filter((resource) => !resource.localeCode);
  if (invalidRss.length > 0) {
    errors.push(
      `RSS资源必须具有localeCode：${invalidRss.map((resource) => resource.id).join(', ')}`,
    );
  }
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
