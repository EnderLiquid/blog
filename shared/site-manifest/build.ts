import type { PostSource } from '../content/post-source.ts';
import {
  LOCALE_DEFINITIONS,
  orderLocaleCodesByPriority,
  resolveLocalePreference,
  type LocaleCode,
} from '../i18n/locales.ts';
import { articlePath, ROBOTS_PATH, rssPath, SITEMAP_PATH } from '../routing/localized-routes.ts';
import { SITE_ORIGIN } from '../site/config.ts';
import {
  SITE_MANIFEST_VERSION,
  isArticleDeliveryPageResource,
  isPageResource,
  parseSiteManifest,
  type ArticleDeliveryPageResource,
  type ArticleFallbackPageResource,
  type ArticlePageResource,
  type LocalizationGroup,
  type MachineResource,
  type SiteManifest,
  type SiteResource,
  type StaticPageResource,
} from './model.ts';
import { articleFallbackResourceId, articleResourceId } from './resource-ids.ts';
import { STATIC_PAGE_DEFINITIONS, type LocalizedStaticPageDefinition } from './static-pages.ts';

export interface BuildSiteManifestInput {
  posts: readonly PostSource[];
  siteOrigin?: string;
}

/** 将所有构建期来源展开为只包含资源拓扑的确定性清单。 */
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
    if (
      !isPageResource(resource) ||
      !('localizationGroupId' in resource) ||
      !resource.localizationGroupId
    ) {
      continue;
    }

    const group = groupById.get(resource.localizationGroupId);

    if (!group) {
      errors.push(`${resource.id}: 找不到语言组“${resource.localizationGroupId}”`);
    } else if (!group.memberResourceIds.includes(resource.id)) {
      errors.push(`${resource.id}: 语言组“${group.id}”没有反向包含该资源`);
    }
  }

  validateArticleDeliveryResources(manifest.resources, resourceById, errors);
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
      resources.push({
        kind: 'static-page',
        id: `page:${definition.pageId}`,
        pageId: definition.pageId,
        path: definition.path(),
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
  return LOCALE_DEFINITIONS.map(({ code }) => ({
    kind: 'static-page',
    id: `page:${definition.pageId}:${code}`,
    pageId: definition.pageId,
    path: definition.path(code),
    localeCode: code,
    localizationGroupId: definition.localizationGroupId,
  }));
}

function buildArticlePageResources(posts: readonly PostSource[]): {
  resources: ArticleDeliveryPageResource[];
  groups: LocalizationGroup[];
} {
  const publishedPosts = posts.filter((post) => !post.metadata.draft);
  const realResources = publishedPosts.map<ArticlePageResource>((post) => ({
    kind: 'article-page',
    id: articleResourceId(post.articleKeyPath, post.localeCode),
    articleKeyPath: post.articleKeyPath,
    path: articlePath(post.localeCode, post.articleKeyPath),
    localeCode: post.localeCode,
    localizationGroupId: `article:${post.articleKeyPath}`,
  }));
  const resourcesByArticle = new Map<string, ArticlePageResource[]>();

  for (const resource of realResources) {
    const variants = resourcesByArticle.get(resource.articleKeyPath) ?? [];
    variants.push(resource);
    resourcesByArticle.set(resource.articleKeyPath, variants);
  }

  const resources: ArticleDeliveryPageResource[] = [];
  const groups: LocalizationGroup[] = [];

  for (const [articleKeyPath, variants] of resourcesByArticle) {
    const variantsByLocale = new Map(variants.map((variant) => [variant.localeCode, variant]));
    const availableLocaleCodes = variants.map((variant) => variant.localeCode);
    const orderedVariants = orderLocaleCodesByPriority(availableLocaleCodes).map((localeCode) =>
      variantsByLocale.get(localeCode)!,
    );

    resources.push(...orderedVariants);

    const xDefaultLocaleCode = resolveLocalePreference([], availableLocaleCodes);
    const xDefaultVariant = xDefaultLocaleCode
      ? variantsByLocale.get(xDefaultLocaleCode)
      : undefined;

    if (!xDefaultVariant) {
      throw new Error(`文章 ${articleKeyPath} 没有可发布语言版本`);
    }

    for (const { code: interfaceLocaleCode } of LOCALE_DEFINITIONS) {
      if (variantsByLocale.has(interfaceLocaleCode)) {
        continue;
      }

      const contentLocaleCode = resolveLocalePreference(
        [interfaceLocaleCode],
        availableLocaleCodes,
      );
      const sourceResource = contentLocaleCode
        ? variantsByLocale.get(contentLocaleCode)
        : undefined;

      if (!sourceResource) {
        throw new Error(`文章 ${articleKeyPath} 无法为${interfaceLocaleCode}选择正文版本`);
      }

      const fallbackResource: ArticleFallbackPageResource = {
        kind: 'article-fallback-page',
        id: articleFallbackResourceId(articleKeyPath, interfaceLocaleCode),
        articleKeyPath,
        path: articlePath(interfaceLocaleCode, articleKeyPath),
        localeCode: interfaceLocaleCode,
        sourceResourceId: sourceResource.id,
      };

      resources.push(fallbackResource);
    }

    groups.push({
      id: `article:${articleKeyPath}`,
      memberResourceIds: orderedVariants.map((variant) => variant.id),
      xDefaultPath: xDefaultVariant.path,
    });
  }

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

function validateArticleDeliveryResources(
  resources: readonly SiteResource[],
  resourceById: ReadonlyMap<string, SiteResource>,
  errors: string[],
): void {
  const articleResources = resources.filter(isArticleDeliveryPageResource);
  const resourcesByArticle = new Map<string, ArticleDeliveryPageResource[]>();

  for (const resource of articleResources) {
    const articleResourcesForKey = resourcesByArticle.get(resource.articleKeyPath) ?? [];
    articleResourcesForKey.push(resource);
    resourcesByArticle.set(resource.articleKeyPath, articleResourcesForKey);

    if (resource.kind !== 'article-fallback-page') {
      continue;
    }

    const sourceResource = resourceById.get(resource.sourceResourceId);

    if (!sourceResource || sourceResource.kind !== 'article-page') {
      errors.push(`${resource.id}: 回退资源来源不是有效真实文章资源“${resource.sourceResourceId}”`);
      continue;
    }

    if (sourceResource.articleKeyPath !== resource.articleKeyPath) {
      errors.push(`${resource.id}: 回退资源与来源文章身份不一致`);
    }

    if (sourceResource.localeCode === resource.localeCode) {
      errors.push(`${resource.id}: 回退资源不能使用同一语言的真实来源`);
    }
  }

  for (const [articleKeyPath, articleResourcesForKey] of resourcesByArticle) {
    const localeCodes = new Set<LocaleCode>();
    const realResources = articleResourcesForKey.filter(
      (resource): resource is ArticlePageResource => resource.kind === 'article-page',
    );
    const realLocaleCodes = realResources.map((resource) => resource.localeCode);

    for (const resource of articleResourcesForKey) {
      if (localeCodes.has(resource.localeCode)) {
        errors.push(`${articleKeyPath}: 公开文章页面重复语言“${resource.localeCode}”`);
      }

      localeCodes.add(resource.localeCode);

      if (resource.kind === 'article-fallback-page') {
        const expectedContentLocaleCode = resolveLocalePreference(
          [resource.localeCode],
          realLocaleCodes,
        );
        const expectedSource = realResources.find(
          (candidate) => candidate.localeCode === expectedContentLocaleCode,
        );

        if (!expectedSource || resource.sourceResourceId !== expectedSource.id) {
          errors.push(`${resource.id}: 回退来源不符合统一语言优先级解析结果`);
        }
      }
    }

    for (const { code } of LOCALE_DEFINITIONS) {
      if (!localeCodes.has(code)) {
        errors.push(`${articleKeyPath}: 缺少${code}界面语言文章页面`);
      }
    }
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
  const memberResources: Exclude<SiteResource, ArticleFallbackPageResource | MachineResource>[] =
    [];
  const xDefaultResource = resourceByPath.get(group.xDefaultPath);

  if (!xDefaultResource || !isPageResource(xDefaultResource)) {
    errors.push(`${group.id}: x-default没有对应页面资源：“${group.xDefaultPath}”`);
  }

  for (const memberId of group.memberResourceIds) {
    const resource = resourceById.get(memberId);

    if (!resource || !isPageResource(resource) || resource.kind === 'article-fallback-page') {
      errors.push(`${group.id}: 成员不是有效真实页面资源：“${memberId}”`);
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
    memberResources.push(resource);

    if (resource.localizationGroupId !== group.id) {
      errors.push(`${group.id}: 成员“${memberId}”反向指向了其他语言组`);
    }
  }

  const orderedLocaleCodes = orderLocaleCodesByPriority([...locales]);
  const actualLocaleCodes = memberResources.map((resource) => resource.localeCode!);

  if (!sameValues(orderedLocaleCodes, actualLocaleCodes)) {
    errors.push(`${group.id}: 语言成员没有按网站优先级排列`);
  }

  if (memberResources.every((resource) => resource.kind === 'article-page')) {
    const xDefaultLocaleCode = resolveLocalePreference([], orderedLocaleCodes);
    const expectedXDefaultResource = memberResources.find(
      (resource) => resource.localeCode === xDefaultLocaleCode,
    );

    if (!expectedXDefaultResource || group.xDefaultPath !== expectedXDefaultResource.path) {
      errors.push(`${group.id}: x-default不是最高优先级的真实文章版本`);
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
