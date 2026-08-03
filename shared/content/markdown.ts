import { bundledLanguagesInfo } from 'shiki/bundle/full';
import javascript from '@shikijs/langs/javascript';
import type { BundledLanguage, LanguageRegistration } from 'shiki';

export const MARKDOWN_HIGHLIGHT_THEME = 'github-dark';

/** 标题保持普通文本，避免整段链接干扰拖选和复制。 */
export const MARKDOWN_HEADING_ANCHOR_LINKS = {
  h1: false,
  h2: false,
  h3: false,
  h4: false,
  h5: false,
  h6: false,
} as const;

/**
 * 使用Shiki完整语言包登记的全部规范语言ID。
 *
 * Nuxt Content会为这些语言生成动态导入映射，实际构建时只加载文章真正使用的语言。
 */
export const MARKDOWN_HIGHLIGHT_LANGUAGES: readonly BundledLanguage[] = bundledLanguagesInfo.map(
  ({ id }) => id as BundledLanguage,
);

/**
 * Nuxt Content按语言名动态导入语法包，不能将Shiki别名直接写为字符串。
 * 例如`@shikijs/langs/js`并不存在，需要为JavaScript的每个别名提供同一语法的注册项。
 */
export const MARKDOWN_HIGHLIGHT_LANGUAGE_ALIASES: readonly LanguageRegistration[] =
  javascript.flatMap((registration) =>
    (registration.aliases ?? []).map((alias) => ({
      ...registration,
      name: alias,
      aliases: [],
    })),
  );
