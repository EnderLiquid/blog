import { SITE_MESSAGES } from '../i18n/messages.ts';
import { DEFAULT_LOCALE_CODE, type LocaleCode } from '../i18n/locales.ts';
import { homePath, postsPath } from '../routing/localized-routes.ts';
import { ROOT_PAGE_METADATA } from '../site/config.ts';

export interface StaticPageMetadata {
  title: string;
  description: string;
}

export interface LocalizedStaticPageDefinition {
  localized: true;
  pageId: string;
  path: (localeCode: LocaleCode) => string;
  indexability: 'index' | 'noindex';
  localizationGroupId: string;
  xDefaultPath: () => string;
  metadata: (localeCode: LocaleCode) => StaticPageMetadata;
}

export interface StandaloneStaticPageDefinition {
  localized: false;
  pageId: string;
  path: () => string;
  indexability: 'index' | 'noindex';
  metadata: () => StaticPageMetadata;
}

export type StaticPageDefinition = LocalizedStaticPageDefinition | StandaloneStaticPageDefinition;

/** 静态页面的唯一声明源；构建器负责将本地化定义展开为具体资源。 */
export const STATIC_PAGE_DEFINITIONS = [
  {
    localized: false,
    pageId: 'root',
    path: () => '/',
    indexability: 'noindex',
    metadata: () => ROOT_PAGE_METADATA,
  },
  {
    localized: true,
    pageId: 'home',
    path: homePath,
    indexability: 'index',
    localizationGroupId: 'page:home',
    xDefaultPath: () => '/',
    metadata: (localeCode: LocaleCode) => SITE_MESSAGES[localeCode].site,
  },
  {
    localized: true,
    pageId: 'posts',
    path: postsPath,
    indexability: 'index',
    localizationGroupId: 'page:posts',
    xDefaultPath: () => postsPath(DEFAULT_LOCALE_CODE),
    metadata: (localeCode: LocaleCode) => SITE_MESSAGES[localeCode].posts,
  },
  {
    localized: false,
    pageId: 'not-found',
    path: () => '/404.html',
    indexability: 'noindex',
    metadata: () => ({
      title: `404 · ${SITE_MESSAGES[DEFAULT_LOCALE_CODE].notFound.title}`,
      description: SITE_MESSAGES[DEFAULT_LOCALE_CODE].notFound.description,
    }),
  },
] as const satisfies readonly StaticPageDefinition[];
