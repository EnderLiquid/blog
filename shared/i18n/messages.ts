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
    about: string;
    openMenu: string;
    closeMenu: string;
    language: string;
    translationUnavailable: string;
  };
  home: {
    welcome: readonly string[];
    featuredPosts: string;
    postsEntryTitle: string;
    postsEntryDescription: string;
    aboutEntryTitle: string;
    aboutEntryDescription: string;
  };
  posts: {
    title: string;
    description: string;
  };
  about: {
    title: string;
    name: string;
    identity: readonly string[];
    quote: readonly string[];
    reflection: string;
    java: string;
    linksLabel: string;
    github: string;
    bilibili: string;
  };
  search: {
    label: string;
    clear: string;
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
    fallbackLanguage: (languageLabel: string) => string;
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
      about: '关于',
      openMenu: '展开导航菜单',
      closeMenu: '收起导航菜单',
      language: '切换语言',
      translationUnavailable: '暂无译文',
    },
    home: {
      welcome: ['这里是 EnderLiquid 的博客。', '欢迎到访。'],
      featuredPosts: '精选文章',
      postsEntryTitle: '文章',
      postsEntryDescription: '搜索和浏览所有文章',
      aboutEntryTitle: '关于',
      aboutEntryDescription: '关于 EnderLiquid',
    },
    posts: {
      title: '文章',
      description: '搜索标题和正文，或按发布时间浏览。',
    },
    about: {
      title: 'ABOUT',
      name: 'EnderLiquid',
      identity: ['软件工程本科在读，', 'Java母语者。'],
      quote: ['“要是能把这个想法', '变成现实就好了”'],
      reflection:
        '我总是像这样莫名其妙地开始。果然，我常常以一个半成品收场，也带走一些或许比成品更珍贵的收获。偶尔，我也真能把一时兴起的想法变成能够运行、也能被人看见的东西。',
      java: 'Java给了我理解系统的第一套框架。现在接触其他语言时，我也在学着少带一点Java口音。',
      linksLabel: '外部坐标',
      github: 'GitHub',
      bilibili: '哔哩哔哩',
    },
    search: {
      label: '搜索文章',
      clear: '清除搜索',
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
      fallbackLanguage: (languageLabel) => `仅提供${languageLabel}版本。`,
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
      about: 'About',
      openMenu: 'Open navigation menu',
      closeMenu: 'Close navigation menu',
      language: 'Change language',
      translationUnavailable: 'Translation unavailable',
    },
    home: {
      welcome: [`This is EnderLiquid's Blog.`, 'Welcome.'],
      featuredPosts: 'Featured posts',
      postsEntryTitle: 'Posts',
      postsEntryDescription: 'Search and browse all posts',
      aboutEntryTitle: 'About',
      aboutEntryDescription: 'About EnderLiquid',
    },
    posts: {
      title: 'Posts',
      description: 'Search titles and content, or browse by publication date.',
    },
    about: {
      title: 'ABOUT',
      name: 'EnderLiquid',
      identity: ['Software engineering undergraduate.', 'Java is my native programming language.'],
      quote: ['“What if I could make this idea real?”'],
      reflection:
        'That is how I keep starting things, for no particularly good reason. Predictably, I often end up with a half-finished project and lessons that may be worth more than the finished thing. Every now and then, though, I do manage to turn a passing idea into something that runs—and that other people can see.',
      java: 'Java gave me my first framework for understanding systems. As I work with other languages, I’m also learning to speak them with a little less of a Java accent.',
      linksLabel: 'Elsewhere',
      github: 'GitHub',
      bilibili: 'Bilibili',
    },
    search: {
      label: 'Search posts',
      clear: 'Clear search',
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
      fallbackLanguage: (languageLabel) => `Available in ${languageLabel} only.`,
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
