import type { LocaleCode } from '../i18n/locales.ts';

/** 生产环境唯一公开源地址。所有机器可读 URL 与 SEO metadata 都从这里派生。 */
export const SITE_ORIGIN = 'https://blog.enderliquid.top';

export interface LocalizedSiteMetadata {
  title: string;
  description: string;
}

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

/** 将站内绝对路径转换为生产站点 URL，并拒绝容易误拼接的相对路径。 */
export function absoluteSiteUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`站点路径必须以斜杠开头：“${path}”`);
  }

  return new URL(path, SITE_ORIGIN).toString();
}
