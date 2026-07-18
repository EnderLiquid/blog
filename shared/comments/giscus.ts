import type { LocaleCode } from '../i18n/locales.ts';
import { normalizeArticleKeyPath } from '../routing/localized-routes.ts';
import { SITE_ORIGIN } from '../site/config.ts';

/**
 * Giscus仓库配置均为嵌入评论组件所需的公开标识，不包含密钥或访问令牌。
 * Discussion身份由文章路径单独派生，不能在此处绑定某篇文章。
 */
export const GISCUS_CONFIG = {
  repo: 'EnderLiquid/blog',
  repoId: 'R_kgDOTcOr4g',
  category: 'Announcements',
  categoryId: 'DIC_kwDOTcOr4s4DBcS9',
  mapping: 'specific',
  strict: '1',
  reactionsEnabled: '0',
  emitMetadata: '0',
  inputPosition: 'top',
  theme: `${SITE_ORIGIN}/giscus-theme.css`,
  loading: 'lazy',
} as const;

export type GiscusLanguage = 'zh-CN' | 'en';

const GISCUS_LANGUAGES: Record<LocaleCode, GiscusLanguage> = {
  'zh-cn': 'zh-CN',
  en: 'en',
};

/** 为文章生成与域名和语言无关的稳定Discussion匹配字符串。 */
export function createArticleDiscussionTerm(articleKeyPath: string): string {
  return `article:${normalizeArticleKeyPath(articleKeyPath)}`;
}

/** 在Giscus边界将站点统一语言代码转换为组件要求的界面语言。 */
export function toGiscusLanguage(localeCode: LocaleCode): GiscusLanguage {
  return GISCUS_LANGUAGES[localeCode];
}
