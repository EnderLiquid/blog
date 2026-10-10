import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import {
  extractMarkdownFrontmatter,
  stripMarkdownFrontmatter,
} from '../../shared/content/frontmatter.ts';
import { ARTICLE_SEGMENT_PATTERN, postMetadataSchema } from '../../shared/content/post-schema.ts';
import { validateMarkdownImages } from '../../shared/content/image-validation.ts';
import { validateMarkdownMath } from '../../shared/content/math-validation.ts';
import { calculateReadingTimeMinutes } from '../../shared/content/reading-time.ts';
import { parseLocaleCode, SUPPORTED_LOCALE_CODES } from '../../shared/i18n/locales.ts';
import type { PostSource } from '../../shared/content/post-source.ts';

/** 从Markdown目录读取并校验所有文章来源，包括不会进入公开清单的草稿。 */
export async function readPostSources(postsDirectory: string): Promise<PostSource[]> {
  const files = (await findMarkdownFiles(postsDirectory)).sort();
  const posts: PostSource[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const relativePath = path.relative(postsDirectory, file).replaceAll('\\', '/');
    const pathSegments = relativePath.split('/');
    const localeFile = pathSegments.pop();
    const localeValue = localeFile?.replace(/\.md$/, '') ?? '';

    if (pathSegments.length === 0) {
      errors.push(`${relativePath}: 文章必须放在articleKeyPath目录中`);
      continue;
    }

    const invalidSegment = pathSegments.find((segment) => !ARTICLE_SEGMENT_PATTERN.test(segment));

    if (invalidSegment) {
      errors.push(`${relativePath}: 路径段“${invalidSegment}”不符合小写kebab-case约定`);
      continue;
    }

    let localeCode;
    try {
      localeCode = parseLocaleCode(localeValue);
    } catch {
      errors.push(`${relativePath}: 文件名必须是${SUPPORTED_LOCALE_CODES.join('或')}`);
      continue;
    }

    const source = await readFile(file, 'utf8');
    const rawFrontmatter = readFrontmatter(source, relativePath, errors);

    if (!rawFrontmatter) {
      continue;
    }

    const metadataResult = postMetadataSchema.safeParse(rawFrontmatter);

    if (!metadataResult.success) {
      for (const issue of metadataResult.error.issues) {
        const field = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        errors.push(`${relativePath}: ${field}${issue.message}`);
      }
      continue;
    }

    const markdown = stripMarkdownFrontmatter(source);

    try {
      await validateMarkdownMath(markdown, relativePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${relativePath}: 数学公式解析失败：${message}`);
      continue;
    }

    try {
      await validateMarkdownImages(markdown, relativePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${relativePath}: 图片解析失败：${message}`);
      continue;
    }

    let readingTimeMinutes: number;

    try {
      readingTimeMinutes = await calculateReadingTimeMinutes(markdown, relativePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${relativePath}: 阅读时长计算失败：${message}`);
      continue;
    }

    posts.push({
      sourcePath: relativePath,
      articleKeyPath: pathSegments.join('/'),
      localeCode,
      metadata: metadataResult.data,
      readingTimeMinutes,
    });
  }

  if (errors.length > 0) {
    throw new Error(`文章内容校验失败：\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }

  return posts;
}

async function findMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return findMarkdownFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.md') ? [entryPath] : [];
    }),
  );

  return nestedFiles.flat();
}

function readFrontmatter(
  source: string,
  relativePath: string,
  errors: string[],
): Record<string, unknown> | undefined {
  const frontmatter = extractMarkdownFrontmatter(source);

  if (!frontmatter) {
    errors.push(`${relativePath}: 缺少有效的YAML Frontmatter`);
    return undefined;
  }

  try {
    const parsedFrontmatter: unknown = parse(frontmatter);

    if (
      !parsedFrontmatter ||
      typeof parsedFrontmatter !== 'object' ||
      Array.isArray(parsedFrontmatter)
    ) {
      errors.push(`${relativePath}: Frontmatter必须是YAML对象`);
      return undefined;
    }

    return parsedFrontmatter as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${relativePath}: Frontmatter解析失败：${message}`);
    return undefined;
  }
}
