export const MARKDOWN_FRONTMATTER_PATTERN = /^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** 返回原始YAML Frontmatter文本；没有有效边界时返回undefined。 */
export function extractMarkdownFrontmatter(source: string): string | undefined {
  return source.match(MARKDOWN_FRONTMATTER_PATTERN)?.[1];
}

/** 去除文件开头的Frontmatter，供内容解析使用。 */
export function stripMarkdownFrontmatter(source: string): string {
  return source.replace(MARKDOWN_FRONTMATTER_PATTERN, '');
}

/**
 * 用空白遮蔽Frontmatter而保留换行，供需要报告原始Markdown行号的AST扫描使用。
 */
export function maskMarkdownFrontmatter(source: string): string {
  const match = source.match(MARKDOWN_FRONTMATTER_PATTERN);

  if (!match?.[0]) {
    return source;
  }

  return `${match[0].replace(/[^\r\n]/g, '')}${source.slice(match[0].length)}`;
}
