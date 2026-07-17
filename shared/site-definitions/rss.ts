import type { LocaleCode } from '../i18n/locales.ts';

/** RSS条目的永久身份命名空间；首次公开发布后不得修改。 */
export const RSS_ITEM_GUID_PREFIX = 'enderliquid:post';

export interface RssFeedDefinition {
  title: string;
  description: string;
}

/** RSS频道和页面Feed discovery使用的唯一文案来源。 */
export const RSS_FEED_DEFINITIONS: Record<LocaleCode, RssFeedDefinition> = {
  'zh-cn': {
    title: `EnderLiquid's Blog · 中文`,
    description: 'EnderLiquid 的博客。',
  },
  en: {
    title: `EnderLiquid's Blog · English`,
    description: `EnderLiquid's blog.`,
  },
};
