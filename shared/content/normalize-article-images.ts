import type { Element, Node, Parent, Root } from 'hast';
import type { VFile } from 'vfile';
import {
  isArticleImageBlockAlign,
  isArticleImageInlineVerticalAlign,
  isArticleImageLayout,
  normalizeArticleImageBoolean,
  normalizeArticleImageDimensionAttribute,
  normalizeArticleImageLength,
} from './article-image.ts';

const INLINE_PARENT_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'cite',
  'code',
  'del',
  'dfn',
  'em',
  'i',
  'ins',
  'kbd',
  'label',
  'mark',
  'p',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
]);

const ALLOWED_IMAGE_PROTOCOLS = new Set(['http:', 'https:']);
const IMAGE_URL_VALIDATION_BASE = 'https://article-image.local';

type Properties = Record<string, unknown>;
type ImageContext = 'block' | 'inline';

/**
 * 将独立图片段落提升为自洽的article-image节点，并校验图片排版属性。
 *
 * 普通Markdown图片通常先生成p > img。带图注时，组件若直接在p内输出figure
 * 会产生非法HTML，因此这里在构建期完成结构归一化，组件本身不读取运行时父节点。
 */
export default function normalizeArticleImages() {
  return (tree: Root, file: VFile): void => {
    normalizeChildren(tree, [], file);
  };
}

function normalizeChildren(parent: Parent, ancestors: Element[], file: VFile): void {
  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index];

    if (!child) {
      continue;
    }

    if (isElement(child) && child.tagName === 'p') {
      const image = getOnlyImageChild(child);

      if (image) {
        validateImage(image, 'block', [...ancestors, child], file);
        parent.children[index] = createBlockImageNode(image);
        continue;
      }
    }

    if (isElement(child) && child.tagName === 'img') {
      const context = inferImageContext(parent);
      validateImage(child, context, [...ancestors, child], file);
      child.properties = {
        ...child.properties,
        layout: getStringProperty(child.properties as Properties, 'layout') ?? context,
      };

      if (
        context === 'block' &&
        getStringProperty(child.properties as Properties, 'layout') !== 'inline'
      ) {
        parent.children[index] = createBlockImageNode(child);
        continue;
      }
    }

    if (isElement(child)) {
      normalizeChildren(child, [...ancestors, child], file);
    } else if (isParent(child)) {
      normalizeChildren(child, ancestors, file);
    }
  }
}

function createBlockImageNode(image: Element): Element {
  return {
    type: 'element',
    tagName: 'article-image',
    properties: {
      ...image.properties,
      layout: 'block',
    },
    children: [],
    position: image.position,
  };
}

function validateImage(
  image: Element,
  context: ImageContext,
  ancestors: Element[],
  file: VFile,
): void {
  const properties = image.properties as Properties;
  const layout = getStringProperty(properties, 'layout') ?? context;
  const alt = getStringProperty(properties, 'alt');
  const src = getStringProperty(properties, 'src');
  const caption = getStringProperty(properties, 'caption');
  const previewValue = getProperty(properties, 'preview');
  const preview = parseBoolean(previewValue, alt !== undefined && alt !== '');
  const align = getStringProperty(properties, 'align');
  const verticalAlign = getStringProperty(properties, 'vertical-align', 'verticalAlign');

  if (alt === undefined) {
    fail(file, image, '图片必须提供alt属性；装饰图片请显式写作alt=""');
  }

  if (!src) {
    fail(file, image, '图片必须提供非空src属性');
  }

  if (!isSafeImageUrl(src)) {
    fail(file, image, `图片地址不安全：${src}`);
  }

  if (!isArticleImageLayout(layout)) {
    fail(file, image, `图片layout必须是block或inline，当前值为“${String(layout)}”`);
  }

  if (caption && layout === 'inline') {
    fail(file, image, 'caption只能用于block图片，不能与inline布局同时使用');
  }

  if (context === 'inline' && layout === 'block') {
    fail(file, image, '文字段落中的图片不能使用block布局，请将图片独立成段');
  }

  if (context === 'block' && layout === 'inline') {
    fail(file, image, '独立段落中的图片不能使用inline布局，请将图片写入正文段落');
  }

  if (align !== undefined && !isArticleImageBlockAlign(align)) {
    fail(file, image, `图片align必须是start、center或end，当前值为“${align}”`);
  }

  if (align !== undefined && layout === 'inline') {
    fail(file, image, 'align只能用于block图片；inline图片请使用vertical-align');
  }

  if (verticalAlign !== undefined && !isArticleImageInlineVerticalAlign(verticalAlign)) {
    fail(file, image, `图片vertical-align值无效：${verticalAlign}`);
  }

  if (verticalAlign !== undefined && layout === 'block') {
    fail(file, image, 'vertical-align只能用于inline图片');
  }

  validateDimension(file, image, properties, 'width');
  validateDimension(file, image, properties, 'height');

  const darkSrc = getStringProperty(properties, 'dark-src', 'darkSrc');

  if (darkSrc !== undefined && !isSafeImageUrl(darkSrc)) {
    fail(file, image, `深色图片地址不安全：${darkSrc}`);
  }

  const loading = getStringProperty(properties, 'loading');
  if (loading !== undefined && loading !== 'lazy' && loading !== 'eager') {
    fail(file, image, `图片loading必须是lazy或eager，当前值为“${loading}”`);
  }

  const decoding = getStringProperty(properties, 'decoding');
  if (
    decoding !== undefined &&
    decoding !== 'async' &&
    decoding !== 'sync' &&
    decoding !== 'auto'
  ) {
    fail(file, image, `图片decoding值无效：${decoding}`);
  }

  if (preview && alt === '') {
    fail(file, image, 'alt为空的装饰图片不能打开灯箱预览');
  }

  if (preview && ancestors.some((ancestor) => ancestor.tagName === 'a')) {
    fail(file, image, '图片已经位于链接内部，不能再次创建灯箱链接；请设置preview="false"');
  }

  if (caption && ancestors.some((ancestor) => ancestor.tagName === 'figure')) {
    fail(file, image, '图片已经位于figure内部，不能通过caption再次创建figure');
  }

  if (previewValue !== undefined && parseBooleanValue(previewValue) === undefined) {
    fail(file, image, `图片preview必须是true或false，当前值为“${String(previewValue)}”`);
  }
}

function validateDimension(
  file: VFile,
  image: Element,
  properties: Properties,
  propertyName: 'width' | 'height',
): void {
  const value = getProperty(properties, propertyName);

  if (value === undefined) {
    return;
  }

  if (normalizeArticleImageLength(asNumberOrString(value)) === undefined) {
    fail(file, image, `图片${propertyName}值无效：${String(value)}`);
  }

  if (typeof value === 'number' && normalizeArticleImageDimensionAttribute(value) === undefined) {
    fail(file, image, `图片${propertyName}数字必须是大于零的整数：${String(value)}`);
  }
}

function inferImageContext(parent: Parent): ImageContext {
  if (parent.type === 'root') {
    return 'block';
  }

  if (isElement(parent) && INLINE_PARENT_TAGS.has(parent.tagName)) {
    return 'inline';
  }

  return 'block';
}

function getOnlyImageChild(parent: Element): Element | undefined {
  const meaningfulChildren = parent.children.filter((child) => {
    return !(child.type === 'text' && /^\s*$/.test(child.value));
  });

  const onlyChild = meaningfulChildren[0];

  return meaningfulChildren.length === 1 &&
    onlyChild &&
    isElement(onlyChild) &&
    onlyChild.tagName === 'img'
    ? onlyChild
    : undefined;
}

function getProperty(properties: Properties, ...names: string[]): unknown {
  for (const name of names) {
    if (name in properties) {
      return properties[name];
    }
  }

  return undefined;
}

function getStringProperty(properties: Properties, ...names: string[]): string | undefined {
  const value = getProperty(properties, ...names);

  return typeof value === 'string' ? value : value === undefined ? undefined : String(value);
}

function asNumberOrString(value: unknown): number | string | undefined {
  return typeof value === 'number' || typeof value === 'string' ? value : undefined;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return normalizeArticleImageBoolean(
    typeof value === 'boolean' || typeof value === 'string' ? value : undefined,
    fallback,
  );
}

function parseBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === '' || normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return undefined;
}

function isSafeImageUrl(value: string | undefined): boolean {
  const normalized = value?.trim();

  if (!normalized || /^[\\/]{2}/.test(normalized)) {
    return false;
  }

  try {
    const url = new URL(normalized, IMAGE_URL_VALIDATION_BASE);

    return url.origin === IMAGE_URL_VALIDATION_BASE || ALLOWED_IMAGE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

function isElement(node: Node): node is Element {
  return node.type === 'element';
}

function isParent(node: Node): node is Parent {
  return 'children' in node && Array.isArray(node.children);
}

function fail(file: VFile, node: Node, message: string): never {
  file.fail(message, node, 'article-image');
}
