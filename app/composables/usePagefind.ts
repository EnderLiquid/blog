import type { LocaleSlug } from '~/utils/posts'
import { parsePostPath } from '~/utils/posts'

interface PagefindResultData {
  url: string
  meta?: Record<string, string>
}

interface PagefindResult {
  score: number
  data: () => Promise<PagefindResultData>
}

interface PagefindResponse {
  results: PagefindResult[]
}

interface PagefindModule {
  init: () => Promise<void>
  destroy: () => Promise<void>
  search: (
    query: string,
    options?: { filters?: Record<string, string | string[]> },
  ) => Promise<PagefindResponse>
}

interface PagefindEntry {
  languages: Partial<Record<LocaleSlug, unknown>>
}

export interface ArticleSearchHit {
  articleKeyPath: string
  score: number
}

export interface PagefindSearchOptions {
  tags?: string[]
}

const pagefindBasePath = '/pagefind/'
const localeSlugs: LocaleSlug[] = ['zh-cn', 'en']
let pagefindModulePromise: Promise<PagefindModule> | undefined
let availableLocalesPromise: Promise<LocaleSlug[]> | undefined
let searchQueue: Promise<void> = Promise.resolve()

export function usePagefind() {
  function search(
    query: string,
    options: PagefindSearchOptions = {},
  ): Promise<ArticleSearchHit[]> {
    const task = searchQueue.then(() => searchAllLocales(query, options))
    searchQueue = task.then(() => undefined, () => undefined)
    return task
  }

  return { search }
}

async function searchAllLocales(
  query: string,
  options: PagefindSearchOptions,
): Promise<ArticleSearchHit[]> {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return []
  }

  const pagefind = await getPagefindModule()
  const availableLocales = await getAvailableLocales()
  const filters = options.tags?.length ? { tag: options.tags } : undefined
  const successfulSearches = []
  let lastError: unknown

  // Pagefind 的多语言索引共享同一个浏览器运行时。按照官方建议，
  // 切换 <html lang> 后重新初始化，再依次查询每个语言索引。
  for (const locale of availableLocales) {
    try {
      successfulSearches.push(
        await searchLocale(pagefind, locale, normalizedQuery, filters),
      )
    } catch (error) {
      lastError = error
    }
  }

  if (successfulSearches.length === 0) {
    throw lastError ?? new Error('Pagefind 搜索失败')
  }

  const mergedHits = new Map<string, ArticleSearchHit>()

  for (const hit of successfulSearches.flat()) {
    if (!hit) {
      continue
    }

    const existing = mergedHits.get(hit.articleKeyPath)

    if (!existing || hit.score > existing.score) {
      mergedHits.set(hit.articleKeyPath, hit)
    }
  }

  return [...mergedHits.values()]
}

async function searchLocale(
  pagefind: PagefindModule,
  locale: LocaleSlug,
  query: string,
  filters?: Record<string, string | string[]>,
): Promise<(ArticleSearchHit | undefined)[]> {
  await pagefind.destroy()

  const htmlElement = document.documentElement
  const pageLocale = htmlElement.lang
  htmlElement.lang = locale

  try {
    await pagefind.init()
  } finally {
    htmlElement.lang = pageLocale
  }

  const response = await pagefind.search(query, { filters })

  return Promise.all(
    response.results.map(async (result) => {
      const data = await result.data()
      const articleKeyPath =
        data.meta?.articleKeyPath ?? parsePostPath(data.url)?.articleKeyPath

      if (!articleKeyPath) {
        return undefined
      }

      return {
        articleKeyPath,
        score: result.score,
      }
    }),
  )
}

async function getPagefindModule(): Promise<PagefindModule> {
  if (!pagefindModulePromise) {
    const modulePath = `${pagefindBasePath}pagefind.js`
    pagefindModulePromise = import(/* @vite-ignore */ modulePath) as Promise<PagefindModule>
  }

  return pagefindModulePromise
}

async function getAvailableLocales(): Promise<LocaleSlug[]> {
  if (!availableLocalesPromise) {
    availableLocalesPromise = fetch(`${pagefindBasePath}pagefind-entry.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Pagefind 索引清单加载失败：${response.status}`)
        }

        return response.json() as Promise<PagefindEntry>
      })
      .then((entry) => localeSlugs.filter((locale) => Boolean(entry.languages[locale])))
  }

  return availableLocalesPromise
}
