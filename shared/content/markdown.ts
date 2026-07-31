import { bundledLanguagesInfo } from 'shiki/bundle/full';
import type { BundledLanguage } from 'shiki';

export const MARKDOWN_HIGHLIGHT_THEME = 'github-dark';

/**
 * 使用Shiki完整语言包登记的全部规范语言ID。
 *
 * Nuxt Content会为这些语言生成动态导入映射，实际构建时只加载文章真正使用的语言；
 * 语言别名由Shiki的语言注册表自动提供，不需要在这里重复维护。
 */
export const MARKDOWN_HIGHLIGHT_LANGUAGES: readonly BundledLanguage[] = bundledLanguagesInfo.map(
  ({ id }) => id as BundledLanguage,
);
