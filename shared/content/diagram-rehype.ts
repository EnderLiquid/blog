import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import type { Element, Node, Parent, Root } from 'hast';
import type { VFile } from 'vfile';
import {
  createDiagramAssetExpectation,
  createDiagramFence,
  diagramPublicUrl,
  findDiagramAssetEntry,
  parseDiagramAssetManifest,
  type DiagramAssetManifest,
  type DiagramPosition,
} from './diagram.ts';

type Properties = Record<string, unknown>;

export interface RenderDiagramFencesOptions {
  /**
   * 仅用于 Nuxt Content 的可序列化解析缓存键；具体版本由 markdown.ts 注入。
   * 渲染器不在运行时分支依赖它，资产清单仍由自身的 renderConfigVersion 校验。
   */
  cacheVersion?: string;
  manifest?: DiagramAssetManifest;
  manifestPath?: string;
}

let cachedManifest:
  | {
      modifiedAt: number;
      path: string;
      value: DiagramAssetManifest;
    }
  | undefined;

/** 将 Mermaid/TikZ 代码围栏替换为预生成的统一文章图片节点。 */
export default function renderDiagramFences(options: RenderDiagramFencesOptions = {}) {
  return (tree: Root, file: VFile): void => {
    const manifest = options.manifest ?? readDiagramAssetManifest(options.manifestPath);
    transformChildren(tree, file, manifest);
  };
}

export function readDiagramAssetManifest(
  manifestPath = path.join(process.cwd(), '.data', 'diagram-assets', 'manifest.json'),
): DiagramAssetManifest {
  const stats = statSync(manifestPath);

  if (cachedManifest?.path === manifestPath && cachedManifest.modifiedAt === stats.mtimeMs) {
    return cachedManifest.value;
  }

  const value = parseDiagramAssetManifest(
    JSON.parse(readFileSync(manifestPath, 'utf8')) as unknown,
  );
  cachedManifest = {
    path: manifestPath,
    modifiedAt: stats.mtimeMs,
    value,
  };

  return value;
}

function transformChildren(parent: Parent, file: VFile, manifest: DiagramAssetManifest): void {
  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index];

    if (!child) {
      continue;
    }

    if (isElement(child) && child.tagName === 'pre') {
      const image = createDiagramImageNode(child, file, manifest);

      if (image) {
        parent.children[index] = image;
        continue;
      }
    }

    if (isParent(child)) {
      transformChildren(child, file, manifest);
    }
  }
}

function createDiagramImageNode(
  pre: Element,
  file: VFile,
  manifest: DiagramAssetManifest,
): Element | undefined {
  const properties = pre.properties as Properties;
  const kind = getDiagramLanguage(properties);

  if (!kind) {
    return undefined;
  }

  const sourcePath = file.path ?? '<unknown Markdown>';
  const position = toDiagramPosition(pre);

  try {
    const fence = createDiagramFence({
      kind,
      source: getStringProperty(properties, 'code') ?? getTextContent(pre),
      meta: getStringProperty(properties, 'meta'),
      sourcePath,
      position,
    });

    if (!fence) {
      return undefined;
    }

    const expectation = createDiagramAssetExpectation(fence);
    const entry = findDiagramAssetEntry(manifest, expectation);

    if (!entry) {
      throw new Error('找不到匹配的预渲染图表资产，请先执行npm run site:manifest');
    }

    const imageSources =
      entry.colorScheme === 'auto'
        ? {
            src: diagramPublicUrl(entry.light.file),
            'dark-src': diagramPublicUrl(entry.dark.file),
          }
        : {
            src: diagramPublicUrl(entry.fixed.file),
          };

    return {
      type: 'element',
      tagName: 'article-image',
      properties: {
        alt: fence.presentation.alt,
        ...imageSources,
        layout: 'block',
        ...(fence.presentation.caption === undefined
          ? {}
          : { caption: fence.presentation.caption }),
        ...(fence.presentation.width === undefined ? {} : { width: fence.presentation.width }),
        ...(fence.presentation.align === undefined ? {} : { align: fence.presentation.align }),
        ...(fence.presentation.preview === undefined
          ? {}
          : { preview: fence.presentation.preview }),
        loading: 'lazy',
        decoding: 'async',
        'data-diagram-kind': fence.kind,
        ...(fence.presentation.preview === false ? {} : { 'diagram-source': fence.source }),
      },
      children: [],
      position: pre.position,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    file.fail(message, pre, 'article-diagram');
  }
}

function getDiagramLanguage(properties: Properties): string | undefined {
  const language = getStringProperty(properties, 'language');

  if (language === 'mermaid' || language === 'tikz') {
    return language;
  }

  const classNames = properties.className;

  if (!Array.isArray(classNames)) {
    return undefined;
  }

  const languageClass = classNames.find(
    (value): value is string => typeof value === 'string' && value.startsWith('language-'),
  );
  const candidate = languageClass?.slice('language-'.length);

  return candidate === 'mermaid' || candidate === 'tikz' ? candidate : undefined;
}

function getStringProperty(properties: Properties, name: string): string | undefined {
  const value = properties[name];

  return typeof value === 'string' ? value : value === undefined ? undefined : String(value);
}

function getTextContent(node: Node): string {
  if (node.type === 'text') {
    return (node as unknown as { value: string }).value;
  }

  if (!isParent(node)) {
    return '';
  }

  return node.children.map(getTextContent).join('');
}

function toDiagramPosition(node: Node): DiagramPosition {
  const start = node.position?.start;

  return start ? { line: start.line, column: start.column } : { line: 1, column: 1 };
}

function isElement(node: Node): node is Element {
  return node.type === 'element';
}

function isParent(node: Node): node is Parent {
  return 'children' in node && Array.isArray(node.children);
}
