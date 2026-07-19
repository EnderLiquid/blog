import type { LocaleCode } from './locales.ts';

/** 语言中立根入口的可见文案；不作为SEO metadata使用。 */
export const ROOT_PAGE_MESSAGES = {
  title: `Blog`,
  description: 'Choose a language / 选择语言',
} as const;

export interface SiteMessages {
  navigation: {
    label: string;
    home: string;
    posts: string;
    openMenu: string;
    closeMenu: string;
    language: string;
    translationUnavailable: string;
  };
  home: {
    title: string;
    description: string;
    shellPlaceholder: string;
    recentPosts: string;
    allPosts: string;
  };
  posts: {
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
    updated: string;
    tags: string;
  };
  comments: {
    title: string;
    loading: string;
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
    navigation: {
      label: '全站导航',
      home: '首页',
      posts: '文章',
      openMenu: '展开导航菜单',
      closeMenu: '收起导航菜单',
      language: '切换语言',
      translationUnavailable: '暂无译文',
    },
    home: {
      title: 'Blog',
      description: '这里是 EnderLiquid 的博客。欢迎到访。',
      shellPlaceholder: 'Nuxt 环境已经就绪。Shell 交互将在这里生长。',
      recentPosts: '最近文章',
      allPosts: '查看全部文章',
    },
    posts: {
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
      updated: '更新于',
      tags: '标签',
    },
    comments: {
      title: '评论',
      loading: '正在加载评论…',
    },
    notFound: {
      title: '页面不存在',
      description: '你访问的地址不存在或已经失效。',
      home: '返回首页',
      posts: '搜索文章',
    },
  },
  en: {
    navigation: {
      label: 'Site navigation',
      home: 'Home',
      posts: 'Posts',
      openMenu: 'Open navigation menu',
      closeMenu: 'Close navigation menu',
      language: 'Change language',
      translationUnavailable: 'Translation unavailable',
    },
    home: {
      title: 'Blog',
      description: `This is EnderLiquid's Blog. Welcome.`,
      shellPlaceholder: 'Nuxt is ready. The shell experience will grow here.',
      recentPosts: 'Recent posts',
      allPosts: 'View all posts',
    },
    posts: {
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
      updated: 'Updated',
      tags: 'Tags',
    },
    comments: {
      title: 'Comments',
      loading: 'Loading comments…',
    },
    notFound: {
      title: 'Page not found',
      description: 'The address does not exist or is no longer available.',
      home: 'Back to home',
      posts: 'Search posts',
    },
  },
};
