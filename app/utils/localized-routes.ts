import { parseLocaleCode, type LocaleCode } from '~~/shared/i18n/locales';

export interface LocalizedPath {
  localeCode: LocaleCode;
  /** 去除语言前缀后的站内路径，始终以斜杠开头。 */
  pathWithoutLocale: string;
}

/** 生成指定语言的首页地址。 */
export function homePath(localeCode: LocaleCode): string {
  return `/${localeCode}/`;
}

/** 生成指定语言的文章列表地址。 */
export function postsPath(localeCode: LocaleCode): string {
  return `/${localeCode}/posts/`;
}

/**
 * 生成公开文章地址。
 * articleKeyPath 是文章稳定身份，不包含开头、结尾斜杠或语言段。
 */
export function articlePath(localeCode: LocaleCode, articleKeyPath: string): string {
  const normalizedArticleKeyPath = normalizeArticleKeyPath(articleKeyPath);
  return `/${localeCode}/posts/${normalizedArticleKeyPath}/`;
}

/** 从公开路径中解析全局语言前缀；没有有效前缀时返回 undefined。 */
export function parseLocalizedPath(path: string): LocalizedPath | undefined {
  const pathname = new URL(path, 'https://blog.local').pathname;
  const segments = pathname.split('/').filter(Boolean);
  const localeCode = tryParseLocaleCode(segments[0]);

  if (!localeCode) {
    return undefined;
  }

  const remainingSegments = segments.slice(1);
  return {
    localeCode,
    pathWithoutLocale: remainingSegments.length === 0 ? '/' : `/${remainingSegments.join('/')}/`,
  };
}

/**
 * 将当前地址切换到目标语言，同时保留查询参数和 hash。
 * 语言由 URL 唯一决定，所以切换语言必须通过导航完成。
 */
export function switchLocalePath(currentPath: string, targetLocaleCode: LocaleCode): string {
  const url = new URL(currentPath, 'https://blog.local');
  const segments = url.pathname.split('/').filter(Boolean);

  if (tryParseLocaleCode(segments[0])) {
    segments[0] = targetLocaleCode;
  } else {
    segments.unshift(targetLocaleCode);
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

function tryParseLocaleCode(value: string | undefined): LocaleCode | undefined {
  if (value === undefined) {
    return undefined;
  }

  try {
    return parseLocaleCode(value);
  } catch {
    return undefined;
  }
}
