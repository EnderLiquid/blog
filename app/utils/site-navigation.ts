import type { PageSeoDescriptor } from '../../shared/site-projections/model.ts';
import { LOCALE_DEFINITIONS, type LocaleCode } from '../../shared/i18n/locales.ts';
import { parseLocalizedPath, switchLocalePath } from '../../shared/routing/localized-routes.ts';

export type PrimaryNavigationSection = 'home' | 'posts';

export interface LocaleNavigationTarget {
  localeCode: LocaleCode;
  label: string;
  path?: string;
  current: boolean;
  available: boolean;
}

/** 根据公开路径判断顶部导航中应标记的主要页面分区。 */
export function resolvePrimaryNavigationSection(path: string): PrimaryNavigationSection {
  const localizedPath = parseLocalizedPath(path);
  return localizedPath?.pathWithoutLocale.startsWith('/posts/') ? 'posts' : 'home';
}

/**
 * 为语言菜单生成可导航目标。
 *
 * 首页和文章列表可以直接替换语言段；文章详情必须使用SEO投影中已经验证过的
 * 多语言关系，避免为不存在的译文构造404地址。
 */
export function createLocaleNavigationTargets(
  currentFullPath: string,
  descriptor?: PageSeoDescriptor,
): LocaleNavigationTarget[] {
  const currentUrl = new URL(currentFullPath, 'https://blog.local');
  const localizedPath = parseLocalizedPath(currentUrl.pathname);
  const currentLocaleCode = localizedPath?.localeCode;
  const articlePage = isArticleDetailPath(localizedPath?.pathWithoutLocale);

  return LOCALE_DEFINITIONS.map((definition) => {
    const current = definition.code === currentLocaleCode;
    const path = articlePage
      ? articleTranslationPath(definition.code, currentUrl, descriptor)
      : switchLocalePath(currentFullPath, definition.code);

    return {
      localeCode: definition.code,
      label: definition.label,
      path: current ? currentFullPath : path,
      current,
      available: current || path !== undefined,
    };
  });
}

function isArticleDetailPath(pathWithoutLocale: string | undefined): boolean {
  return Boolean(pathWithoutLocale?.startsWith('/posts/') && pathWithoutLocale !== '/posts/');
}

function articleTranslationPath(
  targetLocaleCode: LocaleCode,
  currentUrl: URL,
  descriptor: PageSeoDescriptor | undefined,
): string | undefined {
  const alternate = descriptor?.languageAlternates.find(
    (candidate) => candidate.localeCode === targetLocaleCode,
  );

  if (!alternate) {
    return undefined;
  }

  const targetUrl = new URL(alternate.url);
  return `${targetUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
}
