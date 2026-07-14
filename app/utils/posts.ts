import { articlePath, parseLocalizedPath } from '~/utils/localized-routes';
import {
  getLocaleByLanguageTag,
  isLocaleKey,
  LOCALE_DEFINITIONS,
  SUPPORTED_LOCALE_KEYS,
  type LanguageTag,
  type LocaleKey,
} from '~~/shared/i18n/locales';

export interface PostVariant {
  path: string;
  title: string;
  description: string;
  locale: LanguageTag;
  publishedAt: Date | string;
  updatedAt?: Date | string;
  tags?: string[];
}

export interface RoutedPostVariant extends PostVariant {
  localeKey: LocaleKey;
  /** 面向读者的公开文章地址，不是 Nuxt Content 内部路径。 */
  path: string;
}

export interface LogicalPost {
  articleKeyPath: string;
  variants: Partial<Record<LocaleKey, RoutedPostVariant>>;
}

export interface ParsedPostContentPath {
  articleKeyPath: string;
  localeKey: LocaleKey;
}

const localePattern = SUPPORTED_LOCALE_KEYS.join('|');
const postContentPathPattern = new RegExp(`^/posts/(.+)/(${localePattern})/?$`);

/** 解析 Nuxt Content 内部路径：/posts/<articleKeyPath>/<localeKey>。 */
export function parsePostContentPath(path: string): ParsedPostContentPath | undefined {
  const match = path.match(postContentPathPattern);
  const articleKeyPath = match?.[1];
  const localeKey = match?.[2];

  if (!articleKeyPath || !isLocaleKey(localeKey)) {
    return undefined;
  }

  return { articleKeyPath, localeKey };
}

/** 从公开文章 URL 中提取稳定的 articleKeyPath。 */
export function parsePublicArticlePath(path: string): string | undefined {
  const localizedPath = parseLocalizedPath(path);

  if (!localizedPath) {
    return undefined;
  }

  const match = localizedPath.pathWithoutLocale.match(/^\/posts\/(.+)\/$/);
  return match?.[1];
}

/** 生成 Nuxt Content 查询使用的内部路径。 */
export function postContentPath(articleKeyPath: string, localeKey: LocaleKey): string {
  const normalizedArticleKeyPath = articleKeyPath.replace(/^\/+|\/+$/g, '');
  return `/posts/${normalizedArticleKeyPath}/${localeKey}`;
}

/** 将各语言内容版本合并为以 articleKeyPath 标识的逻辑文章。 */
export function groupPostVariants(posts: PostVariant[]): LogicalPost[] {
  const groups = new Map<string, LogicalPost>();

  for (const post of posts) {
    const identity = parsePostContentPath(post.path);

    if (!identity) {
      continue;
    }

    const contentLocaleKey = getLocaleByLanguageTag(post.locale).localeKey;

    if (contentLocaleKey !== identity.localeKey) {
      throw new Error(`文章 ${post.path} 的文件名语言与 Frontmatter locale 不一致`);
    }

    const group = groups.get(identity.articleKeyPath) ?? {
      articleKeyPath: identity.articleKeyPath,
      variants: {},
    };

    group.variants[identity.localeKey] = {
      ...post,
      localeKey: identity.localeKey,
      path: articlePath(identity.localeKey, identity.articleKeyPath),
      tags: post.tags ?? [],
    };
    groups.set(identity.articleKeyPath, group);
  }

  return [...groups.values()];
}

/**
 * 优先选择当前页面语言版本；缺失时按语言注册表顺序选择第一个可用版本。
 * 返回值携带实际 localeKey，调用方必须据此生成链接和日期语言。
 */
export function selectPostVariant(
  post: LogicalPost,
  preferredLocaleKey: LocaleKey,
): RoutedPostVariant {
  const preferredVariant = post.variants[preferredLocaleKey];

  if (preferredVariant) {
    return preferredVariant;
  }

  for (const definition of LOCALE_DEFINITIONS) {
    const fallbackVariant = post.variants[definition.localeKey];

    if (fallbackVariant) {
      return fallbackVariant;
    }
  }

  throw new Error(`文章 ${post.articleKeyPath} 没有可展示的语言版本`);
}
