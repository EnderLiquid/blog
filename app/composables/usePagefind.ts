import { normalizeArticleKeyPath } from '~/utils/localized-routes';
import { parsePublicArticlePath } from '~/utils/posts';
import { parseLocaleCode, type LocaleCode } from '~~/shared/i18n/locales';

interface PagefindResultData {
  url: string;
  meta?: Record<string, string>;
}

interface PagefindResult {
  score: number;
  data: () => Promise<PagefindResultData>;
}

interface PagefindResponse {
  results: PagefindResult[];
}

interface PagefindModule {
  init: () => Promise<void>;
  destroy: () => Promise<void>;
  search: (
    query: string,
    options?: { filters?: Record<string, string | string[]> },
  ) => Promise<PagefindResponse>;
}

interface PagefindEntry {
  languages: Record<string, unknown>;
}

export interface ArticleSearchHit {
  articleKeyPath: string;
  score: number;
}

export interface PagefindSearchOptions {
  tags?: string[];
}

const PAGEFIND_BASE_PATH = '/pagefind/';
let pagefindModulePromise: Promise<PagefindModule> | undefined;
let availableLocaleCodesPromise: Promise<LocaleCode[]> | undefined;
let searchQueue: Promise<void> = Promise.resolve();

/** Pagefind基础设施入口。页面组件只接触逻辑文章命中，不依赖 Pagefind数据结构。 */
export function usePagefind() {
  function search(query: string, options: PagefindSearchOptions = {}): Promise<ArticleSearchHit[]> {
    const task = searchQueue.then(() => searchAllLocales(query, options));

    // Pagefind的浏览器运行时在语言切换时共享状态，搜索必须串行执行。
    // 失败也要释放队列，否则后续输入将永远无法开始。
    searchQueue = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  return { search };
}

async function searchAllLocales(
  query: string,
  options: PagefindSearchOptions,
): Promise<ArticleSearchHit[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const pagefind = await getPagefindModule();
  const availableLocaleCodes = await getAvailableLocaleCodes();
  const filters = options.tags?.length ? { tag: options.tags } : undefined;
  const successfulSearches: (ArticleSearchHit | undefined)[][] = [];
  let lastError: unknown;

  for (const localeCode of availableLocaleCodes) {
    try {
      successfulSearches.push(await searchLocale(pagefind, localeCode, normalizedQuery, filters));
    } catch (error) {
      lastError = error;
    }
  }

  if (successfulSearches.length === 0) {
    throw lastError ?? new Error('Pagefind搜索失败');
  }

  const mergedHits = new Map<string, ArticleSearchHit>();

  for (const hit of successfulSearches.flat()) {
    if (!hit) {
      continue;
    }

    const existingHit = mergedHits.get(hit.articleKeyPath);

    if (!existingHit || hit.score > existingHit.score) {
      mergedHits.set(hit.articleKeyPath, hit);
    }
  }

  return [...mergedHits.values()];
}

async function searchLocale(
  pagefind: PagefindModule,
  localeCode: LocaleCode,
  query: string,
  filters?: Record<string, string | string[]>,
): Promise<(ArticleSearchHit | undefined)[]> {
  await pagefind.destroy();

  const htmlElement = document.documentElement;
  const pageLocaleCode = htmlElement.lang;
  htmlElement.lang = localeCode;

  try {
    // Pagefind 1.x通过 <html lang> 选择对应索引。初始化完成后立即恢复页面语言，
    // 防止基础设施细节影响全局 useSiteLocale所管理的可访问性状态。
    await pagefind.init();
  } finally {
    htmlElement.lang = pageLocaleCode;
  }

  const response = await pagefind.search(query, { filters });

  return Promise.all(
    response.results.map(async (result) => {
      const data = await result.data();
      const rawArticleKeyPath = data.meta?.articleKeyPath ?? parsePublicArticlePath(data.url);

      if (!rawArticleKeyPath) {
        return undefined;
      }

      return {
        articleKeyPath: normalizeArticleKeyPath(rawArticleKeyPath),
        score: result.score,
      };
    }),
  );
}

async function getPagefindModule(): Promise<PagefindModule> {
  if (!pagefindModulePromise) {
    const modulePath = `${PAGEFIND_BASE_PATH}pagefind.js`;
    pagefindModulePromise = import(/* @vite-ignore */ modulePath) as Promise<PagefindModule>;
  }

  return pagefindModulePromise;
}

async function getAvailableLocaleCodes(): Promise<LocaleCode[]> {
  if (!availableLocaleCodesPromise) {
    availableLocaleCodesPromise = fetch(`${PAGEFIND_BASE_PATH}pagefind-entry.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Pagefind索引清单加载失败：${response.status}`);
        }

        return response.json() as Promise<PagefindEntry>;
      })
      .then((entry) =>
        Object.keys(entry.languages).map((language) => {
          try {
            return parseLocaleCode(language);
          } catch {
            throw new Error(`Pagefind生成了未注册的语言索引：“${language}”`);
          }
        }),
      );
  }

  return availableLocaleCodesPromise;
}
