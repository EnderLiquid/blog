import {
  DEFAULT_LOCALE_CODE,
  LOCALE_DEFINITIONS,
  type LocaleCode,
} from '../../shared/i18n/locales.ts';
import { homePath, postsPath } from '../../shared/routing/localized-routes.ts';
import { absoluteSiteUrl } from '../../shared/site/config.ts';
import { escapeXml } from '../../shared/xml/escape.ts';
import type { PublishedPostVariant } from './published-posts.ts';

interface SitemapVariant {
  localeCode: LocaleCode;
  path: string;
  lastModified?: Date | string;
}

interface SitemapGroup {
  variants: SitemapVariant[];
  xDefaultPath: string;
}

/** 生成包含多语言 alternate关系的单一 Sitemap。 */
export function renderSitemap(posts: readonly PublishedPostVariant[]): string {
  const groups = [...createStaticGroups(), ...createArticleGroups(posts)];
  const urlEntries = groups.flatMap((group) =>
    group.variants.map((variant) => renderUrlEntry(variant, group)),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urlEntries.map((entry) => indent(entry)),
    '</urlset>',
    '',
  ].join('\n');
}

function createStaticGroups(): SitemapGroup[] {
  return [
    {
      variants: LOCALE_DEFINITIONS.map((definition) => ({
        localeCode: definition.code,
        path: homePath(definition.code),
      })),
      // 根入口负责语言选择，因此是首页语言组的 x-default，但自身带 noindex，不进入 loc。
      xDefaultPath: '/',
    },
    {
      variants: LOCALE_DEFINITIONS.map((definition) => ({
        localeCode: definition.code,
        path: postsPath(definition.code),
      })),
      xDefaultPath: postsPath(DEFAULT_LOCALE_CODE),
    },
  ];
}

function createArticleGroups(posts: readonly PublishedPostVariant[]): SitemapGroup[] {
  const postsByArticle = new Map<string, Map<LocaleCode, PublishedPostVariant>>();

  for (const post of posts) {
    const variants = postsByArticle.get(post.articleKeyPath) ?? new Map();

    if (variants.has(post.localeCode)) {
      throw new Error(`文章 ${post.articleKeyPath} 的 ${post.localeCode} 版本重复`);
    }

    variants.set(post.localeCode, post);
    postsByArticle.set(post.articleKeyPath, variants);
  }

  return [...postsByArticle.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([articleKeyPath, variantsByLocale]) => {
      const variants = LOCALE_DEFINITIONS.flatMap((definition) => {
        const post = variantsByLocale.get(definition.code);

        return post
          ? [
              {
                localeCode: post.localeCode,
                path: post.path,
                lastModified: post.updatedAt ?? post.publishedAt,
              },
            ]
          : [];
      });
      const defaultVariant =
        variants.find((variant) => variant.localeCode === DEFAULT_LOCALE_CODE) ?? variants[0];

      if (!defaultVariant) {
        throw new Error(`文章 ${articleKeyPath} 没有可写入 Sitemap 的语言版本`);
      }

      return {
        variants,
        xDefaultPath: defaultVariant.path,
      };
    });
}

function renderUrlEntry(variant: SitemapVariant, group: SitemapGroup): string {
  const lines = ['<url>', indent(`<loc>${escapeXml(absoluteSiteUrl(variant.path))}</loc>`)];

  if (variant.lastModified) {
    lines.push(indent(`<lastmod>${formatLastModified(variant.lastModified)}</lastmod>`));
  }

  for (const translation of group.variants) {
    lines.push(
      indent(
        `<xhtml:link rel="alternate" hreflang="${escapeXml(translation.localeCode)}" ` +
          `href="${escapeXml(absoluteSiteUrl(translation.path))}" />`,
      ),
    );
  }

  lines.push(
    indent(
      `<xhtml:link rel="alternate" hreflang="x-default" ` +
        `href="${escapeXml(absoluteSiteUrl(group.xDefaultPath))}" />`,
    ),
    '</url>',
  );

  return lines.join('\n');
}

function formatLastModified(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`无法序列化 Sitemap日期：“${String(value)}”`);
  }

  return date.toISOString().slice(0, 10);
}

function indent(value: string): string {
  return value
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}
