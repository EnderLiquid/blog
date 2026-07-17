import type { LocaleCode } from '../i18n/locales.ts';
import type { StaticPageId } from '../site-manifest/model.ts';

export interface PageSeoDefinition {
  title: string;
  description: string;
  indexability: 'index' | 'noindex';
}

type LocalizedPageSeoDefinitions = Record<LocaleCode, PageSeoDefinition>;

interface StaticPageSeoDefinitions {
  root: PageSeoDefinition;
  home: LocalizedPageSeoDefinitions;
  posts: LocalizedPageSeoDefinitions;
  'not-found': PageSeoDefinition;
}

/**
 * 静态页面的SEO唯一来源。
 *
 * 这里的文本只服务HTML head和索引策略；即使与页面可见文案相同，也不得从messages导入。
 */
export const STATIC_PAGE_SEO_DEFINITIONS: StaticPageSeoDefinitions = {
  root: {
    title: `EnderLiquid's Blog`,
    description: 'Choose a language / 选择语言',
    indexability: 'noindex',
  },
  home: {
    'zh-cn': {
      title: `EnderLiquid's Blog`,
      description: 'EnderLiquid 的博客。',
      indexability: 'index',
    },
    en: {
      title: `EnderLiquid's Blog`,
      description: `EnderLiquid's blog.`,
      indexability: 'index',
    },
  },
  posts: {
    'zh-cn': {
      title: '文章',
      description: '搜索标题和正文，或按发布时间浏览。',
      indexability: 'index',
    },
    en: {
      title: 'Posts',
      description: 'Search titles and content, or browse by publication date.',
      indexability: 'index',
    },
  },
  'not-found': {
    title: '404 · 页面不存在',
    description: '你访问的地址不存在或已经失效。',
    indexability: 'noindex',
  },
};

/** 运行时错误不属于可枚举静态资源，但仍使用独立于可见文案的SEO定义。 */
export const RUNTIME_ERROR_SEO_DEFINITIONS: Record<LocaleCode, PageSeoDefinition> = {
  'zh-cn': {
    title: '页面错误',
    description: '处理页面时发生错误。',
    indexability: 'noindex',
  },
  en: {
    title: 'Page error',
    description: 'An error occurred while processing the page.',
    indexability: 'noindex',
  },
};

export function resolveStaticPageSeo(
  pageId: StaticPageId,
  localeCode?: LocaleCode,
): PageSeoDefinition {
  if (pageId === 'home' || pageId === 'posts') {
    if (!localeCode) {
      throw new Error(`本地化静态页面“${pageId}”缺少localeCode`);
    }

    return STATIC_PAGE_SEO_DEFINITIONS[pageId][localeCode];
  }

  return STATIC_PAGE_SEO_DEFINITIONS[pageId];
}
