import { createHash } from 'node:crypto';
import {
  isArticleImageBlockAlign,
  normalizeArticleImageBoolean,
  normalizeArticleImageLength,
} from './article-image.ts';

export const DIAGRAM_ASSET_MANIFEST_VERSION = 1;
export const DIAGRAM_RENDER_CONFIG_VERSION = 'diagram-render-v2';
export const DIAGRAM_PUBLIC_BASE = '/_diagram-assets/';
export const DIAGRAM_FONT_ASSET_VERSION = 'node-tikzjax@1.0.5-bakoma-embedded-v1';

export const DIAGRAM_KINDS = ['mermaid', 'tikz'] as const;
export type DiagramKind = (typeof DIAGRAM_KINDS)[number];

export const DIAGRAM_VARIANTS = ['light', 'dark'] as const;
export type DiagramVariant = (typeof DIAGRAM_VARIANTS)[number];

export const DIAGRAM_COLOR_SCHEMES = ['auto', 'light', 'dark'] as const;
export type DiagramColorScheme = (typeof DIAGRAM_COLOR_SCHEMES)[number];

export interface EffectiveDiagramAppearance {
  palette: DiagramVariant;
  canvas: 'transparent' | 'paper';
}

export interface DiagramTheme {
  paper: string;
  ink: string;
  line: string;
  muted: string;
  signal: string;
}

/** 图表主题使用站点令牌的实际色值；变更必须同步升级渲染配置指纹。 */
export const DIAGRAM_THEMES: Readonly<Record<DiagramVariant, DiagramTheme>> = {
  light: {
    paper: '#e9e5d8',
    ink: '#252720',
    line: '#a9aa9d',
    muted: '#65685d',
    signal: '#9d2348',
  },
  dark: {
    paper: '#22231f',
    ink: '#e2dfd2',
    line: '#55574e',
    muted: '#aaa99d',
    signal: '#f07194',
  },
};

export const DIAGRAM_RENDERER_IDS: Readonly<Record<DiagramKind, string>> = {
  mermaid: 'merman-cli@0.8.0-alpha.3',
  tikz: 'node-tikzjax@1.0.5',
};

export interface DiagramPosition {
  line: number;
  column: number;
}

export interface DiagramPresentation {
  alt: string;
  colorScheme: DiagramColorScheme;
  caption?: string;
  width?: string;
  align?: 'start' | 'center' | 'end';
  preview?: boolean;
}

export interface DiagramFence {
  kind: DiagramKind;
  source: string;
  sourcePath: string;
  position: DiagramPosition;
  presentation: DiagramPresentation;
}

export interface DiagramVariantAsset {
  fingerprint: string;
  file: string;
  contentDigest: string;
}

export interface DiagramAssetEntry {
  kind: DiagramKind;
  light: DiagramVariantAsset;
  dark: DiagramVariantAsset;
}

export interface DiagramAssetManifest {
  version: typeof DIAGRAM_ASSET_MANIFEST_VERSION;
  publicBase: typeof DIAGRAM_PUBLIC_BASE;
  renderConfigVersion: typeof DIAGRAM_RENDER_CONFIG_VERSION;
  fontAssetVersion: typeof DIAGRAM_FONT_ASSET_VERSION;
  assets: Record<string, DiagramAssetEntry>;
}

export interface DiagramAssetExpectation {
  identity: string;
  kind: DiagramKind;
  variants: Readonly<Record<DiagramVariant, { fingerprint: string; file: string }>>;
}

export class DiagramContentError extends Error {
  readonly sourcePath: string;
  readonly position: DiagramPosition;

  constructor(sourcePath: string, position: DiagramPosition, message: string) {
    super(`${sourcePath}:${position.line}:${position.column}：${message}`);
    this.name = 'DiagramContentError';
    this.sourcePath = sourcePath;
    this.position = position;
  }
}

/** 统一行尾以保证 Windows、Linux 上相同图表获得同一资产指纹。 */
export function normalizeDiagramSource(source: string): string {
  return source.replaceAll('\r\n', '\n').replaceAll('\r', '\n').replace(/\n+$/, '');
}

export function isDiagramKind(value: unknown): value is DiagramKind {
  return typeof value === 'string' && (DIAGRAM_KINDS as readonly string[]).includes(value);
}

export function isDiagramColorScheme(value: unknown): value is DiagramColorScheme {
  return typeof value === 'string' && (DIAGRAM_COLOR_SCHEMES as readonly string[]).includes(value);
}

/** 将作者选择与页面变体解析为实际使用的调色板和画布。 */
export function resolveDiagramAppearance(
  colorScheme: DiagramColorScheme,
  pageVariant: DiagramVariant,
): EffectiveDiagramAppearance {
  if (colorScheme === 'auto') {
    return { palette: pageVariant, canvas: 'transparent' };
  }

  return { palette: colorScheme, canvas: 'paper' };
}

export function createDiagramFence(input: {
  kind: unknown;
  source: unknown;
  meta?: unknown;
  sourcePath: string;
  position: DiagramPosition;
}): DiagramFence | undefined {
  if (!isDiagramKind(input.kind)) {
    return undefined;
  }

  const source = typeof input.source === 'string' ? normalizeDiagramSource(input.source) : '';

  if (source.trim() === '') {
    throw new DiagramContentError(
      input.sourcePath,
      input.position,
      `${diagramLabel(input.kind)}围栏不能为空`,
    );
  }

  return {
    kind: input.kind,
    source,
    sourcePath: input.sourcePath,
    position: input.position,
    presentation: parseDiagramPresentation(input.meta, input.sourcePath, input.position),
  };
}

/**
 * 解析围栏信息串中的严格键值语法，例如：alt="流程图" width="42rem"。
 * 不使用MDC的花括号属性，以避免与代码高亮元数据冲突。
 */
export function parseDiagramPresentation(
  meta: unknown,
  sourcePath: string,
  position: DiagramPosition,
): DiagramPresentation {
  const source = meta === undefined || meta === null ? '' : String(meta);
  const attributes = parseQuotedAttributes(source, sourcePath, position);
  const allowedNames = new Set(['alt', 'caption', 'width', 'align', 'preview', 'color-scheme']);

  for (const name of attributes.keys()) {
    if (!allowedNames.has(name)) {
      throw new DiagramContentError(
        sourcePath,
        position,
        `${diagramMetaLabel(name)}不是支持的图表属性`,
      );
    }
  }

  const alt = attributes.get('alt');

  if (alt === undefined || alt.trim() === '') {
    throw new DiagramContentError(sourcePath, position, '图表围栏必须提供非空alt属性');
  }

  const caption = attributes.get('caption');
  const rawWidth = attributes.get('width');
  const width = rawWidth === undefined ? undefined : normalizeArticleImageLength(rawWidth);

  if (rawWidth !== undefined && width === undefined) {
    throw new DiagramContentError(sourcePath, position, `图表width值无效：${rawWidth}`);
  }

  const rawAlign = attributes.get('align');

  if (rawAlign !== undefined && !isArticleImageBlockAlign(rawAlign)) {
    throw new DiagramContentError(
      sourcePath,
      position,
      `图表align必须是start、center或end，当前值为“${rawAlign}”`,
    );
  }

  const rawPreview = attributes.get('preview');
  const preview = parsePreview(rawPreview, sourcePath, position);
  const colorScheme = parseColorScheme(attributes.get('color-scheme'), sourcePath, position);

  return {
    alt,
    colorScheme,
    ...(caption === undefined || caption.trim() === '' ? {} : { caption }),
    ...(width === undefined ? {} : { width }),
    ...(rawAlign === undefined ? {} : { align: rawAlign }),
    ...(preview === undefined ? {} : { preview }),
  };
}

/** 读取Markdown MDAST，保留围栏位置而不依赖全文正则。 */
export async function scanMarkdownDiagrams(
  markdown: string,
  sourcePath: string,
): Promise<DiagramFence[]> {
  const [{ unified }, { default: remarkParse }, { VFile }] = await Promise.all([
    import('unified'),
    import('remark-parse'),
    import('vfile'),
  ]);
  const file = new VFile({ path: sourcePath, value: markdown });
  const tree = unified().use(remarkParse).parse(file) as unknown;
  const fences: DiagramFence[] = [];

  visitMarkdownNode(tree, (node) => {
    if (node.type !== 'code') {
      return;
    }

    const position = toDiagramPosition(node.position);
    const fence = createDiagramFence({
      kind: node.lang,
      source: node.value,
      meta: node.meta,
      sourcePath,
      position,
    });

    if (fence) {
      fences.push(fence);
    }
  });

  return fences;
}

export function createDiagramAssetExpectation(fence: DiagramFence): DiagramAssetExpectation {
  const identity = sha256(
    stableJson({
      kind: fence.kind,
      source: fence.source,
      colorScheme: fence.presentation.colorScheme,
      renderer: DIAGRAM_RENDERER_IDS[fence.kind],
      renderConfigVersion: DIAGRAM_RENDER_CONFIG_VERSION,
      ...(fence.kind === 'tikz' ? { fontAssetVersion: DIAGRAM_FONT_ASSET_VERSION } : {}),
    }),
  );
  const variants = Object.fromEntries(
    DIAGRAM_VARIANTS.map((variant) => {
      const appearance = resolveDiagramAppearance(fence.presentation.colorScheme, variant);
      const fingerprint = sha256(
        stableJson({
          identity,
          kind: fence.kind,
          variant,
          appearance,
          rendererConfig: getDiagramRendererConfig(
            fence.kind,
            variant,
            fence.presentation.colorScheme,
          ),
        }),
      );

      return [variant, { fingerprint, file: `${fingerprint}.${variant}.svg` }];
    }),
  ) as DiagramAssetExpectation['variants'];

  return {
    identity,
    kind: fence.kind,
    variants,
  };
}

export function getDiagramRendererConfig(
  kind: DiagramKind,
  pageVariant: DiagramVariant,
  colorScheme: DiagramColorScheme = 'auto',
): Record<string, unknown> {
  const appearance = resolveDiagramAppearance(colorScheme, pageVariant);
  const theme = DIAGRAM_THEMES[appearance.palette];

  if (kind === 'mermaid') {
    return {
      backgroundColor: 'transparent',
      svgPipeline: 'resvg-safe',
      theme: 'base',
      themeVariables: {
        background: 'transparent',
        primaryColor: theme.paper,
        primaryTextColor: theme.ink,
        primaryBorderColor: theme.line,
        lineColor: theme.signal,
        secondaryColor: theme.paper,
        tertiaryColor: theme.paper,
        secondaryBorderColor: theme.line,
        tertiaryBorderColor: theme.line,
        clusterBkg: 'transparent',
        clusterBorder: theme.line,
        titleColor: theme.ink,
        edgeLabelBackground: theme.paper,
        nodeTextColor: theme.ink,
        fontFamily: "Georgia, 'Noto Serif SC', serif",
      },
    };
  }

  return {
    embedFontCss: false,
    embedFontData: true,
    defaultInk: theme.ink,
    canvas: appearance.canvas,
    fontAssetVersion: DIAGRAM_FONT_ASSET_VERSION,
  };
}

export function createEmptyDiagramAssetManifest(): DiagramAssetManifest {
  return {
    version: DIAGRAM_ASSET_MANIFEST_VERSION,
    publicBase: DIAGRAM_PUBLIC_BASE,
    renderConfigVersion: DIAGRAM_RENDER_CONFIG_VERSION,
    fontAssetVersion: DIAGRAM_FONT_ASSET_VERSION,
    assets: {},
  };
}

export function parseDiagramAssetManifest(value: unknown): DiagramAssetManifest {
  if (!isRecord(value)) {
    throw new Error('图表资产清单必须是对象');
  }

  if (value.version !== DIAGRAM_ASSET_MANIFEST_VERSION) {
    throw new Error('图表资产清单版本不匹配');
  }

  if (value.publicBase !== DIAGRAM_PUBLIC_BASE) {
    throw new Error('图表资产清单公共路径不匹配');
  }

  if (value.renderConfigVersion !== DIAGRAM_RENDER_CONFIG_VERSION) {
    throw new Error('图表渲染配置版本不匹配');
  }

  if (typeof value.fontAssetVersion !== 'string') {
    throw new Error('图表资产清单缺少字体资产版本');
  }

  if (!isRecord(value.assets)) {
    throw new Error('图表资产清单缺少assets对象');
  }

  const assets: Record<string, DiagramAssetEntry> = {};

  for (const [identity, rawEntry] of Object.entries(value.assets)) {
    if (!isSha256(identity) || !isRecord(rawEntry) || !isDiagramKind(rawEntry.kind)) {
      throw new Error('图表资产清单包含无效条目');
    }

    assets[identity] = {
      kind: rawEntry.kind,
      light: parseDiagramVariantAsset(rawEntry.light, 'light'),
      dark: parseDiagramVariantAsset(rawEntry.dark, 'dark'),
    };
  }

  return {
    version: DIAGRAM_ASSET_MANIFEST_VERSION,
    publicBase: DIAGRAM_PUBLIC_BASE,
    renderConfigVersion: DIAGRAM_RENDER_CONFIG_VERSION,
    fontAssetVersion: DIAGRAM_FONT_ASSET_VERSION,
    assets,
  };
}

export function findDiagramAssetEntry(
  manifest: DiagramAssetManifest,
  expectation: DiagramAssetExpectation,
): DiagramAssetEntry | undefined {
  const entry = manifest.assets[expectation.identity];

  if (!entry || entry.kind !== expectation.kind) {
    return undefined;
  }

  return DIAGRAM_VARIANTS.every((variant) => {
    const expected = expectation.variants[variant];
    const actual = entry[variant];

    return actual.fingerprint === expected.fingerprint && actual.file === expected.file;
  })
    ? entry
    : undefined;
}

export function diagramPublicUrl(file: string): string {
  return `${DIAGRAM_PUBLIC_BASE}${file}`;
}

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

export function diagramLabel(kind: DiagramKind): string {
  return kind === 'mermaid' ? 'Mermaid' : 'TikZ';
}

function parseQuotedAttributes(
  source: string,
  sourcePath: string,
  position: DiagramPosition,
): Map<string, string> {
  const attributes = new Map<string, string>();
  let index = 0;

  while (index < source.length) {
    index = skipWhitespace(source, index);

    if (index >= source.length) {
      break;
    }

    const nameStart = index;

    while (index < source.length && /[a-z-]/i.test(source[index] ?? '')) {
      index += 1;
    }

    const name = source.slice(nameStart, index);

    if (!/^[a-z][a-z-]*$/i.test(name)) {
      throw new DiagramContentError(sourcePath, position, '图表属性必须使用name="value"格式');
    }

    index = skipWhitespace(source, index);

    if (source[index] !== '=') {
      throw new DiagramContentError(sourcePath, position, `图表属性“${name}”缺少等号`);
    }

    index = skipWhitespace(source, index + 1);

    if (source[index] !== '"') {
      throw new DiagramContentError(sourcePath, position, `图表属性“${name}”必须使用双引号包裹值`);
    }

    index += 1;
    let value = '';
    let closed = false;

    while (index < source.length) {
      const character = source[index];

      if (character === '"') {
        index += 1;
        closed = true;
        break;
      }

      if (character === '\\') {
        const escaped = source[index + 1];

        if (escaped !== '"' && escaped !== '\\') {
          throw new DiagramContentError(
            sourcePath,
            position,
            `图表属性“${name}”只支持\\"和\\\\转义`,
          );
        }

        value += escaped;
        index += 2;
        continue;
      }

      value += character;
      index += 1;
    }

    if (!closed) {
      throw new DiagramContentError(sourcePath, position, `图表属性“${name}”缺少结束双引号`);
    }

    if (attributes.has(name)) {
      throw new DiagramContentError(sourcePath, position, `图表属性“${name}”不能重复`);
    }

    attributes.set(name, value);

    if (index < source.length && !/\s/.test(source[index] ?? '')) {
      throw new DiagramContentError(sourcePath, position, '图表属性之间必须使用空白分隔');
    }
  }

  return attributes;
}

function parsePreview(
  value: string | undefined,
  sourcePath: string,
  position: DiagramPosition,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized !== 'true' && normalized !== 'false') {
    throw new DiagramContentError(
      sourcePath,
      position,
      `图表preview必须是true或false，当前值为“${value}”`,
    );
  }

  return normalizeArticleImageBoolean(normalized, true);
}

function parseColorScheme(
  value: string | undefined,
  sourcePath: string,
  position: DiagramPosition,
): DiagramColorScheme {
  if (value === undefined) {
    return 'auto';
  }

  if (!isDiagramColorScheme(value)) {
    throw new DiagramContentError(
      sourcePath,
      position,
      `图表color-scheme必须是auto、light或dark，当前值为“${value}”`,
    );
  }

  return value;
}

function parseDiagramVariantAsset(value: unknown, variant: DiagramVariant): DiagramVariantAsset {
  if (!isRecord(value)) {
    throw new Error(`图表资产清单缺少${variant}变体`);
  }

  const fingerprint = value.fingerprint;
  const file = value.file;
  const contentDigest = value.contentDigest;

  if (
    !isSha256(fingerprint) ||
    typeof file !== 'string' ||
    file !== `${fingerprint}.${variant}.svg` ||
    !isSha256(contentDigest)
  ) {
    throw new Error(`图表资产清单${variant}变体无效`);
  }

  return { fingerprint, file, contentDigest };
}

function toDiagramPosition(value: unknown): DiagramPosition {
  if (isRecord(value) && isRecord(value.start)) {
    const line = value.start.line;
    const column = value.start.column;

    if (typeof line === 'number' && typeof column === 'number') {
      return { line, column };
    }
  }

  return { line: 1, column: 1 };
}

function visitMarkdownNode(value: unknown, visit: (node: MarkdownNode) => void): void {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return;
  }

  const node = value as unknown as MarkdownNode;
  visit(node);

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      visitMarkdownNode(child, visit);
    }
  }
}

function skipWhitespace(source: string, index: number): number {
  let cursor = index;

  while (cursor < source.length && /\s/.test(source[cursor] ?? '')) {
    cursor += 1;
  }

  return cursor;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, sortValue(nestedValue)]),
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function diagramMetaLabel(name: string): string {
  return `图表属性“${name}”`;
}

interface MarkdownNode {
  type: string;
  children?: unknown[];
  lang?: unknown;
  meta?: unknown;
  value?: unknown;
  position?: unknown;
}
