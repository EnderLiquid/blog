import type { LocaleKey } from '~~/shared/i18n/locales';
import { isLocaleKey } from '~~/shared/i18n/locales';

export interface LocalizedPath {
  localeKey: LocaleKey;
  /** 去除语言前缀后的站内路径，始终以斜杠开头。 */
  pathWithoutLocale: string;
}

/** 生成指定语言的首页地址。 */
export function homePath(localeKey: LocaleKey): string {
  return `/${localeKey}/`;
}

/** 生成指定语言的文章列表地址。 */
export function postsPath(localeKey: LocaleKey): string {
  return `/${localeKey}/posts/`;
}

/**
 * 生成公开文章地址。
 * articleKeyPath 是文章稳定身份，不包含开头、结尾斜杠或语言段。
 */
export function articlePath(localeKey: LocaleKey, articleKeyPath: string): string {
  const normalizedArticleKeyPath = normalizeArticleKeyPath(articleKeyPath);
  return `/${localeKey}/posts/${normalizedArticleKeyPath}/`;
}

/** 从公开路径中解析全局语言前缀。 */
export function parseLocalizedPath(path: string): LocalizedPath | undefined {
  const pathname = new URL(path, 'https://blog.local').pathname;
  const segments = pathname.split('/').filter(Boolean);
  const localeKey = segments[0];

  if (!isLocaleKey(localeKey)) {
    return undefined;
  }

  const remainingSegments = segments.slice(1);
  return {
    localeKey,
    pathWithoutLocale: remainingSegments.length === 0 ? '/' : `/${remainingSegments.join('/')}/`,
  };
}

/**
 * 将当前地址切换到目标语言，同时保留查询参数和 hash。
 * 语言由 URL 唯一决定，所以切换语言必须通过导航完成。
 */
export function switchLocalePath(currentPath: string, targetLocaleKey: LocaleKey): string {
  const url = new URL(currentPath, 'https://blog.local');
  const segments = url.pathname.split('/').filter(Boolean);

  if (isLocaleKey(segments[0])) {
    segments[0] = targetLocaleKey;
  } else {
    segments.unshift(targetLocaleKey);
  }

  url.pathname = `/${segments.join('/')}/`;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** 移除 articleKeyPath 两端斜杠，并拒绝空文章身份。 */
export function normalizeArticleKeyPath(articleKeyPath: string): string {
  const normalized = articleKeyPath.replace(/^\/+|\/+$/g, '');

  if (!normalized) {
    throw new Error('articleKeyPath 不能为空');
  }

  return normalized;
}
