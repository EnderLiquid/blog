import type { DiagramKind, EffectiveDiagramAppearance } from './diagram.ts';
import { DIAGRAM_THEMES } from './diagram.ts';

const ACTIVE_SVG_TAG_PATTERN =
  /<\s*\/?\s*(?:animate(?:Color|Motion|Transform)?|discard|foreignObject|script|set)\b/i;
const EVENT_HANDLER_ATTRIBUTE_PATTERN = /\son[a-z]+\s*=/i;
const RESOURCE_ATTRIBUTE_PATTERN =
  /\s(?:href|xlink:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const CSS_URL_PATTERN = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi;
const CSS_IMPORT_PATTERN = /@import\s+/i;

/**
 * 将node-tikzjax输出中的默认黑色改为有效调色板的墨色。
 * TikZ输出会将默认笔画、部分作者显式black和默认文字都归一为黑色；其它作者颜色保持不变。
 */
export function themeTikzSvg(svg: string, appearance: EffectiveDiagramAppearance): string {
  const ink = DIAGRAM_THEMES[appearance.palette].ink;
  const themed = svg.replace(/#(?:000|000000)\b/gi, ink);
  const withDefaultInk = themed.replace(/<svg\b([^>]*)>/i, (match, attributes: string) => {
    if (/\sfill\s*=/.test(attributes)) {
      return match;
    }

    return `<svg${attributes} fill="${ink}" color="${ink}">`;
  });

  return appearance.canvas === 'paper'
    ? addSvgCanvasBackground(withDefaultInk, DIAGRAM_THEMES[appearance.palette].paper)
    : withDefaultInk;
}

/** 在SVG完整viewBox内插入仅由内部令牌提供颜色的背景画布。 */
export function addSvgCanvasBackground(svg: string, color: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error(`SVG画布颜色无效：${color}`);
  }

  const root = svg.match(/<svg\b([^>]*)>/i);

  if (!root || root.index === undefined) {
    throw new Error('SVG缺少根svg元素');
  }

  const [x, y, width, height] = parseSvgViewBox(root[1] ?? '');
  const rootEnd = root.index + root[0].length;
  const insertionIndex = findCanvasInsertionIndex(svg, rootEnd);
  const canvas = `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}"/>`;

  return `${svg.slice(0, insertionIndex)}${canvas}${svg.slice(insertionIndex)}`;
}

function parseSvgViewBox(attributes: string): [number, number, number, number] {
  const match = attributes.match(/\sviewBox\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  const rawValue = match?.[1] ?? match?.[2];
  const values = rawValue
    ?.trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);

  const [x, y, width, height] = values ?? [];

  if (
    values?.length !== 4 ||
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error('SVG缺少有效viewBox');
  }

  return [x, y, width, height];
}

function findCanvasInsertionIndex(svg: string, rootEnd: number): number {
  const remaining = svg.slice(rootEnd);
  const leadingWhitespaceLength = remaining.match(/^\s*/)?.[0].length ?? 0;
  const candidateIndex = rootEnd + leadingWhitespaceLength;
  const openingDefs = svg.slice(candidateIndex).match(/^<defs\b[^>]*>/i);

  if (!openingDefs) {
    return rootEnd;
  }

  const closingDefsIndex = svg.indexOf('</defs>', candidateIndex + openingDefs[0].length);

  if (closingDefsIndex === -1) {
    throw new Error('SVG的defs未正确闭合');
  }

  return closingDefsIndex + '</defs>'.length;
}

/** 拒绝动态SVG与未经允许的外部资源，输出只可作为静态img内容使用。 */
export function assertSafeDiagramSvg(svg: string, kind: DiagramKind): void {
  const root = svg.match(/<svg\b([^>]*)>/i);

  if (!root) {
    throw new Error('SVG缺少根svg元素');
  }

  if (!/\sviewBox\s*=\s*(?:"[^"]+"|'[^']+')/i.test(root[1] ?? '')) {
    throw new Error('SVG缺少有效viewBox');
  }

  if (ACTIVE_SVG_TAG_PATTERN.test(svg)) {
    throw new Error('SVG包含不允许的动态或HTML嵌入元素');
  }

  if (EVENT_HANDLER_ATTRIBUTE_PATTERN.test(svg)) {
    throw new Error('SVG包含不允许的事件处理属性');
  }

  assertSafeResourceAttributes(svg);

  if (CSS_IMPORT_PATTERN.test(svg)) {
    throw new Error('SVG CSS包含不允许的@import');
  }

  assertSafeCssUrls(svg, kind);
}

function assertSafeResourceAttributes(svg: string): void {
  RESOURCE_ATTRIBUTE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = RESOURCE_ATTRIBUTE_PATTERN.exec(svg))) {
    const value = (match[1] ?? match[2] ?? match[3] ?? '').trim();

    if (!isAllowedSvgResource(value)) {
      throw new Error(`SVG包含不允许的外部资源：${value}`);
    }
  }
}

function assertSafeCssUrls(svg: string, kind: DiagramKind): void {
  CSS_URL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CSS_URL_PATTERN.exec(svg))) {
    const value = (match[1] ?? match[2] ?? match[3] ?? '').trim();

    if (value.startsWith('#')) {
      continue;
    }

    if (kind === 'tikz' && /^data:font\/ttf;base64,[a-z0-9+/=]+$/i.test(value)) {
      continue;
    }

    throw new Error(`SVG CSS包含不允许的资源：${value}`);
  }
}

function isAllowedSvgResource(value: string): boolean {
  return value.startsWith('#');
}
