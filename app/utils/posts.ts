export const supportedLocales = ['zh-CN', 'en'] as const
export type SupportedLocale = (typeof supportedLocales)[number]
export type LocaleSlug = 'zh-cn' | 'en'

export interface PostVariant {
  path: string
  title: string
  description: string
  locale: SupportedLocale
  publishedAt: Date | string
  updatedAt?: Date | string
  tags?: string[]
}

export interface LogicalPost {
  articleKeyPath: string
  variants: Partial<Record<SupportedLocale, PostVariant>>
}

const postPathPattern = /^\/posts\/(.+)\/(zh-cn|en)\/?$/

export function parsePostPath(path: string): {
  articleKeyPath: string
  locale: SupportedLocale
  localeSlug: LocaleSlug
} | undefined {
  const match = path.match(postPathPattern)

  if (!match) {
    return undefined
  }

  const articleKeyPath = match[1]
  const localeSlug = match[2] as LocaleSlug

  if (!articleKeyPath) {
    return undefined
  }

  return {
    articleKeyPath,
    locale: localeSlug === 'zh-cn' ? 'zh-CN' : 'en',
    localeSlug,
  }
}

export function groupPostVariants(posts: PostVariant[]): LogicalPost[] {
  const groups = new Map<string, LogicalPost>()

  for (const post of posts) {
    const identity = parsePostPath(post.path)

    if (!identity) {
      continue
    }

    const group = groups.get(identity.articleKeyPath) ?? {
      articleKeyPath: identity.articleKeyPath,
      variants: {},
    }

    group.variants[post.locale] = {
      ...post,
      path: withTrailingSlash(post.path),
      tags: post.tags ?? [],
    }
    groups.set(identity.articleKeyPath, group)
  }

  return [...groups.values()]
}

export function selectPostVariant(
  post: LogicalPost,
  preferredLocale: SupportedLocale,
): PostVariant {
  const preferred = post.variants[preferredLocale]

  if (preferred) {
    return preferred
  }

  const fallbackLocale = preferredLocale === 'zh-CN' ? 'en' : 'zh-CN'
  const fallback = post.variants[fallbackLocale]

  if (!fallback) {
    throw new Error(`文章 ${post.articleKeyPath} 没有可展示的语言版本`)
  }

  return fallback
}

export function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`
}
