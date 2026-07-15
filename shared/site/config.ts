import type { LocaleCode } from '../i18n/locales.ts';

/** 生产环境唯一公开源地址。所有机器可读 URL 与 SEO metadata 都从这里派生。 */
export const SITE_ORIGIN = 'https://blog.enderliquid.top';

export interface LocalizedSiteMetadata {
  title: string;
  description: string;
}

/** 语言中立根入口的可见文本与SEO文本共享该来源。 */
export const ROOT_PAGE_METADATA = {
  title: 'Blog',
  description: 'Choose a language / 选择语言',
} as const;

/** 同时供 Vue页面和构建期机器文件使用，避免 RSS 与页面描述发生漂移。 */
export const SITE_METADATA: Record<LocaleCode, LocalizedSiteMetadata> = {
  'zh-cn': {
    title: 'Blog',
    description: '一个使用 Nuxt 构建的开发者博客。',
  },
  en: {
    title: 'Blog',
    description: 'A developer blog built with Nuxt.',
  },
};
