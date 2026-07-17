import { DEFAULT_LOCALE_CODE, type LocaleCode } from '../i18n/locales.ts';
import { homePath, postsPath } from '../routing/localized-routes.ts';
import type { StaticPageId } from './model.ts';

export interface LocalizedStaticPageDefinition {
  localized: true;
  pageId: StaticPageId;
  path: (localeCode: LocaleCode) => string;
  localizationGroupId: string;
  xDefaultPath: () => string;
}

export interface StandaloneStaticPageDefinition {
  localized: false;
  pageId: StaticPageId;
  path: () => string;
}

export type StaticPageDefinition = LocalizedStaticPageDefinition | StandaloneStaticPageDefinition;

/** 静态页面拓扑的唯一声明源；页面SEO由独立定义负责。 */
export const STATIC_PAGE_DEFINITIONS = [
  {
    localized: false,
    pageId: 'root',
    path: () => '/',
  },
  {
    localized: true,
    pageId: 'home',
    path: homePath,
    localizationGroupId: 'page:home',
    xDefaultPath: () => '/',
  },
  {
    localized: true,
    pageId: 'posts',
    path: postsPath,
    localizationGroupId: 'page:posts',
    xDefaultPath: () => postsPath(DEFAULT_LOCALE_CODE),
  },
  {
    localized: false,
    pageId: 'not-found',
    path: () => '/404.html',
  },
] as const satisfies readonly StaticPageDefinition[];
