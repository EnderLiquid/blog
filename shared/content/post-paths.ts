import { parseLocaleCode, type LocaleCode } from '../i18n/locales.ts';

export interface ParsedPostContentPath {
  articleKeyPath: string;
  localeCode: LocaleCode;
}

const postContentPathPattern = /^\/posts\/(.+)\/([^/]+)\/?$/;

/** 解析 Nuxt Content内部路径：/posts/<articleKeyPath>/<localeCode>。 */
export function parsePostContentPath(path: string): ParsedPostContentPath | undefined {
  const match = path.match(postContentPathPattern);
  const articleKeyPath = match?.[1];
  const localeValue = match?.[2];

  if (!articleKeyPath || localeValue === undefined) {
    return undefined;
  }

  try {
    return {
      articleKeyPath,
      localeCode: parseLocaleCode(localeValue),
    };
  } catch {
    return undefined;
  }
}

/** 生成 Nuxt Content查询使用的内部路径。 */
export function postContentPath(articleKeyPath: string, localeCode: LocaleCode): string {
  const normalizedArticleKeyPath = articleKeyPath.replace(/^\/+|\/+$/g, '');

  if (!normalizedArticleKeyPath) {
    throw new Error('articleKeyPath 不能为空');
  }

  return `/posts/${normalizedArticleKeyPath}/${localeCode}`;
}
