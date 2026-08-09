import type { DiagramKind, DiagramVariant } from './diagram.ts';
import { DIAGRAM_THEMES } from './diagram.ts';

const ACTIVE_SVG_TAG_PATTERN =
  /<\s*\/?\s*(?:animate(?:Color|Motion|Transform)?|discard|foreignObject|script|set)\b/i;
const EVENT_HANDLER_ATTRIBUTE_PATTERN = /\son[a-z]+\s*=/i;
const RESOURCE_ATTRIBUTE_PATTERN =
  /\s(?:href|xlink:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const CSS_URL_PATTERN = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi;
const CSS_IMPORT_PATTERN = /@import\s+/i;

/**
 * 将node-tikzjax输出中的默认黑色改为本站当前主题墨色。
 * TikZ输出会将默认笔画、部分作者显式black和默认文字都归一为黑色，首版统一映射。
 */
export function themeTikzSvg(svg: string, variant: DiagramVariant): string {
  const ink = DIAGRAM_THEMES[variant].ink;
  const themed = svg.replace(/#(?:000|000000)\b/gi, ink);

  return themed.replace(/<svg\b([^>]*)>/i, (match, attributes: string) => {
    if (/\sfill\s*=/.test(attributes)) {
      return match;
    }

    return `<svg${attributes} fill="${ink}" color="${ink}">`;
  });
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
