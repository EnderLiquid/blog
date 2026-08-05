import { bundledLanguagesInfo } from 'shiki/bundle/full';
import javascript from '@shikijs/langs/javascript';
import type { BundledLanguage, LanguageRegistration } from 'shiki';
import normalizeArticleImages from './normalize-article-images.ts';
import failOnKaTeXErrors from './strict-katex-errors.ts';

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

/** Markdown公式只使用明确的美元定界符，避免引入浏览器端二次排版。 */
export const MARKDOWN_MATH_REMARK_PLUGINS = {
  'remark-math': {
    options: {
      singleDollarTextMath: true,
    },
  },
} as const;

/** KaTeX 同时输出视觉HTML与MathML；错误必须阻止内容构建。 */
export const MARKDOWN_MATH_KATEX_OPTIONS = {
  output: 'htmlAndMathml',
  strict: 'error',
  trust: false,
} as const;

export const MARKDOWN_MATH_REHYPE_PLUGINS = {
  'rehype-katex': {
    options: MARKDOWN_MATH_KATEX_OPTIONS,
  },
  'strict-katex-errors': {
    instance: failOnKaTeXErrors,
    src: '~~/shared/content/strict-katex-errors',
  },
} as const;

/** 将图片段落归一化为块级节点，并在构建期校验图片排版属性。 */
export const MARKDOWN_IMAGE_REHYPE_PLUGINS = {
  'normalize-article-images': {
    instance: normalizeArticleImages,
    src: '~~/shared/content/normalize-article-images',
  },
} as const;

export const MARKDOWN_REHYPE_PLUGINS = {
  ...MARKDOWN_MATH_REHYPE_PLUGINS,
  ...MARKDOWN_IMAGE_REHYPE_PLUGINS,
} as const;
