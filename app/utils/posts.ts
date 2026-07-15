import { parsePostContentPath } from '~~/shared/content/post-paths';
import { LOCALE_DEFINITIONS, type LocaleCode } from '~~/shared/i18n/locales';
import { articlePath, parseLocalizedPath } from '~~/shared/routing/localized-routes';

/** Nuxt Content查询返回的文章版本；语言由内容路径而不是 Frontmatter 决定。 */
export interface PostVariant {
  path: string;
  title: string;
  description: string;
  publishedAt: Date | string;
  updatedAt?: Date | string;
  tags?: string[];
}

export interface RoutedPostVariant extends PostVariant {
  localeCode: LocaleCode;
  /** 面向读者的公开文章地址，不是 Nuxt Content内部路径。 */
  path: string;
}

export interface LogicalPost {
  articleKeyPath: string;
  variants: Partial<Record<LocaleCode, RoutedPostVariant>>;
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

/** 将各语言内容版本合并为以 articleKeyPath 标识的逻辑文章。 */
export function groupPostVariants(posts: PostVariant[]): LogicalPost[] {
  const groups = new Map<string, LogicalPost>();

  for (const post of posts) {
    const identity = parsePostContentPath(post.path);

    if (!identity) {
      continue;
    }

    const group = groups.get(identity.articleKeyPath) ?? {
      articleKeyPath: identity.articleKeyPath,
      variants: {},
    };

    group.variants[identity.localeCode] = {
      ...post,
      localeCode: identity.localeCode,
      path: articlePath(identity.localeCode, identity.articleKeyPath),
      tags: post.tags ?? [],
    };
    groups.set(identity.articleKeyPath, group);
  }

  return [...groups.values()];
}

/**
 * 优先选择当前页面语言版本；缺失时按语言注册表顺序选择第一个可用版本。
 * 返回值携带实际 localeCode，调用方必须据此生成链接和日期语言。
 */
export function selectPostVariant(
  post: LogicalPost,
  preferredLocaleCode: LocaleCode,
): RoutedPostVariant {
  const preferredVariant = post.variants[preferredLocaleCode];

  if (preferredVariant) {
    return preferredVariant;
  }

  for (const definition of LOCALE_DEFINITIONS) {
    const fallbackVariant = post.variants[definition.code];

    if (fallbackVariant) {
      return fallbackVariant;
    }
  }

  throw new Error(`文章 ${post.articleKeyPath} 没有可展示的语言版本`);
}
