import type { LocaleCode } from '../i18n/locales.ts';
import {
  isPageResource,
  type LocalizationGroup,
  type MachineResource,
  type PageResource,
  type SiteManifest,
  type SiteResource,
  type StaticPageResource,
} from './model.ts';

export interface LocalizedAlternate {
  localeCode: LocaleCode | 'x-default';
  url: string;
}

export function absoluteManifestUrl(manifest: SiteManifest, path: string): string {
  return new URL(path, manifest.siteOrigin).toString();
}

export function findPageByPath(manifest: SiteManifest, path: string): PageResource {
  const resource = manifest.resources.find(
    (candidate) => candidate.path === path && isPageResource(candidate),
  );

  if (!resource || !isPageResource(resource)) {
    throw new Error(`清单中找不到页面：“${path}”`);
  }

  return resource;
}

export function findMachineResource(
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

export function findStaticPageResource(
  manifest: SiteManifest,
  pageId: StaticPageResource['pageId'],
  localeCode?: LocaleCode,
): StaticPageResource {
  const resource = manifest.resources.find(
    (candidate): candidate is StaticPageResource =>
      candidate.kind === 'static-page' &&
      candidate.pageId === pageId &&
      candidate.localeCode === localeCode,
  );

  if (!resource) {
    throw new Error(`清单中找不到静态页面：${pageId}${localeCode ? `:${localeCode}` : ''}`);
  }

  return resource;
}

/** 页面head和Sitemap共同使用的唯一多语言关系投影。 */
export function createLocalizedAlternates(
  manifest: SiteManifest,
  resource: PageResource,
): LocalizedAlternate[] {
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

function createResourceById(manifest: SiteManifest): Map<string, SiteResource> {
  return new Map(manifest.resources.map((resource) => [resource.id, resource]));
}
