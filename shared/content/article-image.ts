export const ARTICLE_IMAGE_LAYOUTS = ['block', 'inline'] as const;
export type ArticleImageLayout = (typeof ARTICLE_IMAGE_LAYOUTS)[number];

export const ARTICLE_IMAGE_BLOCK_ALIGNS = ['start', 'center', 'end'] as const;
export type ArticleImageBlockAlign = (typeof ARTICLE_IMAGE_BLOCK_ALIGNS)[number];

export const ARTICLE_IMAGE_INLINE_VERTICAL_ALIGNS = [
  'baseline',
  'middle',
  'text-top',
  'text-bottom',
  'top',
  'bottom',
  'sub',
  'super',
] as const;
export type ArticleImageInlineVerticalAlign = (typeof ARTICLE_IMAGE_INLINE_VERTICAL_ALIGNS)[number];

const CSS_LENGTH_PATTERN =
  /^(?:0|-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|ex|ch|lh|rlh|vw|vh|vmin|vmax|vi|vb|svw|lvw|dvw|svh|lvh|dvh|%))$/i;
const CSS_FUNCTION_PATTERN = /^(?:min|max|clamp|calc)\([0-9a-zA-Z.%+\-*/ ,]+\)$/i;
const POSITIVE_CSS_LENGTH_PATTERN =
  /^(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|ex|ch|lh|rlh|vw|vh|vmin|vmax|vi|vb|svw|lvw|dvw|svh|lvh|dvh|%)$/i;
const INTEGER_PATTERN = /^\d+$/;

export function isArticleImageLayout(value: unknown): value is ArticleImageLayout {
  return typeof value === 'string' && ARTICLE_IMAGE_LAYOUTS.includes(value as ArticleImageLayout);
}

export function isArticleImageBlockAlign(value: unknown): value is ArticleImageBlockAlign {
  return (
    typeof value === 'string' &&
    ARTICLE_IMAGE_BLOCK_ALIGNS.includes(value as ArticleImageBlockAlign)
  );
}

export function isArticleImageInlineVerticalAlign(
  value: unknown,
): value is ArticleImageInlineVerticalAlign {
  return (
    typeof value === 'string' &&
    (ARTICLE_IMAGE_INLINE_VERTICAL_ALIGNS.includes(value as ArticleImageInlineVerticalAlign) ||
      isArticleImageLength(value, true))
  );
}

export function isArticleImageLength(value: unknown, allowZero = false): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim();

  if (allowZero && normalized === '0') {
    return true;
  }

  return (
    POSITIVE_CSS_LENGTH_PATTERN.test(normalized) ||
    CSS_FUNCTION_PATTERN.test(normalized) ||
    (allowZero && CSS_LENGTH_PATTERN.test(normalized))
  );
}

export function normalizeArticleImageLength(
  value: number | string | undefined,
  allowZero = false,
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < (allowZero ? 0 : Number.EPSILON)) {
      return undefined;
    }

    return `${value}px`;
  }

  const normalized = value.trim();

  if (allowZero && normalized === '0') {
    return normalized;
  }

  if (INTEGER_PATTERN.test(normalized)) {
    const numericValue = Number(normalized);

    return numericValue > 0 ? `${numericValue}px` : undefined;
  }

  if (isArticleImageLength(normalized, allowZero)) {
    return normalized;
  }

  return undefined;
}

export function normalizeArticleImageDimensionAttribute(
  value: number | string | undefined,
): number | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }

  if (typeof value === 'string' && INTEGER_PATTERN.test(value.trim())) {
    const numericValue = Number(value.trim());

    return numericValue > 0 ? numericValue : undefined;
  }

  return undefined;
}

export function normalizeArticleImageBoolean(
  value: boolean | string | undefined,
  fallback: boolean,
): boolean {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === '' || normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return fallback;
}
