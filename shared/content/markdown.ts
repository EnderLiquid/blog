export const MARKDOWN_HIGHLIGHT_THEME = 'github-dark';

/**
 * 构建期显式加载博客近期会使用的语言，避免Shiki把常见代码静默降级为纯文本。
 * 未注册语言仍由Nuxt MDC回退为text，不应中断文章构建。
 */
export const MARKDOWN_HIGHLIGHT_LANGUAGES = [
  'js',
  'jsx',
  'json',
  'ts',
  'tsx',
  'vue',
  'css',
  'html',
  'bash',
  'shell',
  'md',
  'mdc',
  'yaml',
  'java',
  'kotlin',
  'c',
  'cpp',
  'python',
] as const;
