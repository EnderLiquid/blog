import type { LocaleKey } from '~~/shared/i18n/locales';

export interface SiteMessages {
  site: {
    title: string;
    description: string;
  };
  root: {
    title: string;
    description: string;
    chooseLanguage: string;
  };
  home: {
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

export const SITE_MESSAGES: Record<LocaleKey, SiteMessages> = {
  'zh-cn': {
    site: {
      title: 'Blog',
      description: '一个使用 Nuxt 构建的开发者博客。',
    },
    root: {
      title: '选择语言',
      description: '选择你希望浏览的站点语言。',
      chooseLanguage: '进入博客',
    },
    home: {
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
    site: {
      title: 'Blog',
      description: 'A developer blog built with Nuxt.',
    },
    root: {
      title: 'Choose a language',
      description: 'Choose the language you want to use.',
      chooseLanguage: 'Enter the blog',
    },
    home: {
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
