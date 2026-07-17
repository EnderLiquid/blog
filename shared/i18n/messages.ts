import type { LocaleCode } from './locales.ts';

/** 语言中立根入口的可见文案；不作为SEO metadata使用。 */
export const ROOT_PAGE_MESSAGES = {
  title: `Blog`,
  description: 'Choose a language / 选择语言',
} as const;

export interface SiteMessages {
  home: {
    title: string;
    description: string;
    shellPlaceholder: string;
    recentPosts: string;
    allPosts: string;
  };
  posts: {
    backHome: string;
    title: string;
    description: string;
  };
  search: {
    label: string;
    placeholder: string;
    sortLabel: string;
    relevance: string;
    latest: string;
    oldest: string;
    loading: string;
    noResults: string;
    allPosts: string;
    results: string;
    unavailable: string;
  };
  article: {
    allPosts: string;
    updated: string;
    tags: string;
  };
  notFound: {
    title: string;
    description: string;
    home: string;
    posts: string;
  };
}

/** Vue模板使用的可见文案；机器metadata不得导入该对象。 */
export const SITE_MESSAGES: Record<LocaleCode, SiteMessages> = {
  'zh-cn': {
    home: {
      title: 'Blog',
      description: '这里是 EnderLiquid 的博客。欢迎到访。',
      shellPlaceholder: 'Nuxt 环境已经就绪。Shell 交互将在这里生长。',
      recentPosts: '最近文章',
      allPosts: '查看全部文章',
    },
    posts: {
      backHome: '返回首页',
      title: '文章',
      description: '搜索标题和正文，或按发布时间浏览。',
    },
    search: {
      label: '搜索文章',
      placeholder: '搜索标题和正文…',
      sortLabel: '排序',
      relevance: '相关度',
      latest: '最新发布',
      oldest: '最早发布',
      loading: '正在搜索…',
      noResults: '没有匹配的文章。',
      allPosts: '篇文章',
      results: '条结果',
      unavailable: '全文搜索暂不可用，当前展示全部文章。',
    },
    article: {
      allPosts: '全部文章',
      updated: '更新于',
      tags: '标签',
    },
    notFound: {
      title: '页面不存在',
      description: '你访问的地址不存在或已经失效。',
      home: '返回首页',
      posts: '搜索文章',
    },
  },
  en: {
    home: {
      title: 'Blog',
      description: `This is EnderLiquid's Blog. Welcome.`,
      shellPlaceholder: 'Nuxt is ready. The shell experience will grow here.',
      recentPosts: 'Recent posts',
      allPosts: 'View all posts',
    },
    posts: {
      backHome: 'Back to home',
      title: 'Posts',
      description: 'Search titles and content, or browse by publication date.',
    },
    search: {
      label: 'Search posts',
      placeholder: 'Search titles and content…',
      sortLabel: 'Sort by',
      relevance: 'Relevance',
      latest: 'Newest',
      oldest: 'Oldest',
      loading: 'Searching…',
      noResults: 'No matching posts.',
      allPosts: 'posts',
      results: 'results',
      unavailable: 'Full-text search is unavailable. Showing all posts.',
    },
    article: {
      allPosts: 'All posts',
      updated: 'Updated',
      tags: 'Tags',
    },
    notFound: {
      title: 'Page not found',
      description: 'The address does not exist or is no longer available.',
      home: 'Back to home',
      posts: 'Search posts',
    },
  },
};
