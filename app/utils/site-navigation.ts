import { LOCALE_DEFINITIONS, type LocaleCode } from '../../shared/i18n/locales.ts';
import { parseLocalizedPath, switchLocalePath } from '../../shared/routing/localized-routes.ts';
import type { ArticleDeliveryIndexView } from '../../shared/site-projections/model.ts';

export type PrimaryNavigationSection = 'home' | 'posts' | 'about';

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

  if (localizedPath?.pathWithoutLocale.startsWith('/posts/')) {
    return 'posts';
  }

  if (localizedPath?.pathWithoutLocale === '/about/') {
    return 'about';
  }

  return 'home';
}

/**
 * 为语言菜单生成界面语言目标。
 *
 * 静态页面直接替换URL语言段；文章详情消费Article Delivery投影，因此真实译文和
 * 回退投递页面都可以切换。菜单顺序始终继承网站语言优先级，不借用SEO hreflang。
 */
export function createLocaleNavigationTargets(
  currentFullPath: string,
  articleDeliveryIndex: ArticleDeliveryIndexView,
): LocaleNavigationTarget[] {
  const currentUrl = new URL(currentFullPath, 'https://blog.local');
  const localizedPath = parseLocalizedPath(currentUrl.pathname);
  const currentLocaleCode = localizedPath?.localeCode;
  const currentDelivery = articleDeliveryIndex[normalizeArticlePagePath(currentUrl.pathname)];

  return LOCALE_DEFINITIONS.map((definition) => {
    const current = definition.code === currentLocaleCode;
    const articleTarget = currentDelivery
      ? Object.values(articleDeliveryIndex).find(
          (candidate) =>
            candidate.articleKeyPath === currentDelivery.articleKeyPath &&
            candidate.interfaceLocaleCode === definition.code,
        )
      : undefined;
    const path = currentDelivery
      ? articleTarget
        ? `${articleTarget.path}${currentUrl.search}${currentUrl.hash}`
        : undefined
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

function normalizeArticlePagePath(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}
