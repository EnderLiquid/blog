import type { MDCElement, MDCNode } from '@nuxtjs/mdc';
import { parseMarkdown } from '@nuxtjs/mdc/runtime';
import { createDiagramFence, type DiagramKind } from './diagram.ts';
import normalizeArticleImages from './normalize-article-images.ts';
import { estimateTokens } from './token-estimator.ts';

/** 首版预计阅读速度：300个估算token/分钟。 */
export const READING_TIME_TOKENS_PER_MINUTE = 300;

const READING_TIME_PARSE_OPTIONS = {
  rehype: {
    plugins: {
      'normalize-article-images': {
        instance: normalizeArticleImages,
      },
    },
  },
  highlight: false,
} as const;

const BLOCK_ELEMENT_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]);

/** 从Markdown语义树提取读者实际可见的文章文本。 */
export async function extractArticleReadingText(
  markdown: string,
  sourcePath: string,
): Promise<string> {
  const result = await parseMarkdown(markdown, READING_TIME_PARSE_OPTIONS, {
    fileOptions: {
      path: sourcePath,
    },
  });

  return result.body.children.map((node) => collectReadingText(node, sourcePath)).join(' ');
}

/** 根据文章语义文本估算预计阅读分钟数。 */
export async function calculateReadingTimeMinutes(
  markdown: string,
  sourcePath: string,
): Promise<number> {
  const readingText = await extractArticleReadingText(markdown, sourcePath);

  return estimateReadingTimeMinutes(readingText);
}

/** 将一段已经提取的文章文本换算为预计阅读分钟数。 */
export function estimateReadingTimeMinutes(readingText: string): number {
  const estimatedTokens = estimateTokens(readingText);

  return Math.max(1, Math.ceil(estimatedTokens / READING_TIME_TOKENS_PER_MINUTE));
}

function collectReadingText(node: MDCNode, sourcePath: string): string {
  if (node.type === 'text') {
    return node.value;
  }

  if (node.type === 'comment') {
    return '';
  }

  if (node.tag === 'img' || node.tag === 'source') {
    return '';
  }

  if (node.tag === 'article-image') {
    return getStringProperty(node, 'caption') ?? '';
  }

  if (node.tag === 'pre') {
    const diagramCaption = extractDiagramCaption(node, sourcePath);

    if (diagramCaption !== undefined) {
      return diagramCaption;
    }
  }

  const children = node.children
    .map((child) => collectReadingText(child, sourcePath))
    .filter((text) => text !== '');

  return isBlockElement(node.tag) ? children.join(' ') : children.join('');
}

function extractDiagramCaption(element: MDCElement, sourcePath: string): string | undefined {
  const kind = getDiagramKind(element);

  if (!kind) {
    return undefined;
  }

  const source = getStringProperty(element, 'code') ?? collectElementText(element);
  const fence = createDiagramFence({
    kind,
    source,
    meta: getStringProperty(element, 'meta'),
    sourcePath,
    position: { line: 1, column: 1 },
  });

  return fence?.presentation.caption ?? '';
}

function getDiagramKind(element: MDCElement): DiagramKind | undefined {
  const language = getStringProperty(element, 'language');

  if (language === 'mermaid' || language === 'tikz') {
    return language;
  }

  const classNames = element.props?.className;

  if (!Array.isArray(classNames)) {
    return undefined;
  }

  const languageClass = classNames.find(
    (value): value is string => typeof value === 'string' && value.startsWith('language-'),
  );
  const candidate = languageClass?.slice('language-'.length);

  return candidate === 'mermaid' || candidate === 'tikz' ? candidate : undefined;
}

function collectElementText(element: MDCElement): string {
  return element.children
    .map((child) => {
      if (child.type === 'text') {
        return child.value;
      }

      if (child.type === 'comment') {
        return '';
      }

      return collectElementText(child);
    })
    .join('');
}

function getStringProperty(element: MDCElement, name: string): string | undefined {
  const value = element.props?.[name];

  return typeof value === 'string' ? value : value === undefined ? undefined : String(value);
}

function isBlockElement(tag: string): boolean {
  return BLOCK_ELEMENT_TAGS.has(tag);
}
