import { LOCALE_DEFINITIONS, type LocaleCode } from '../../shared/i18n/locales.ts';
import { articlePath, homePath, rssPath } from '../../shared/routing/localized-routes.ts';
import { absoluteSiteUrl, SITE_METADATA } from '../../shared/site/config.ts';
import { escapeXml } from '../../shared/xml/escape.ts';
import type { PublishedPostVariant } from './published-posts.ts';

/** 将一个语言的文章摘要序列化为 RSS 2.0。调用方负责提前按语言过滤。 */
export function renderRssFeed(
  localeCode: LocaleCode,
  posts: readonly PublishedPostVariant[],
): string {
  const localeDefinition = LOCALE_DEFINITIONS.find((definition) => definition.code === localeCode);

  if (!localeDefinition) {
    throw new Error(`语言注册表缺少 RSS 配置：“${localeCode}”`);
  }

  const mismatchedPost = posts.find((post) => post.localeCode !== localeCode);

  if (mismatchedPost) {
    throw new Error(
      `RSS ${localeCode} 收到了 ${mismatchedPost.localeCode} 文章：“${mismatchedPost.articleKeyPath}”`,
    );
  }

  const metadata = SITE_METADATA[localeCode];
  const sortedPosts = [...posts].sort(
    (left, right) => toDate(right.publishedAt).getTime() - toDate(left.publishedAt).getTime(),
  );
  const latestModification = sortedPosts.reduce<Date | undefined>((latest, post) => {
    const candidate = toDate(post.updatedAt ?? post.publishedAt);
    return !latest || candidate > latest ? candidate : latest;
  }, undefined);

  const channelLines = [
    `<title>${escapeXml(`${metadata.title} · ${localeDefinition.label}`)}</title>`,
    `<link>${escapeXml(absoluteSiteUrl(homePath(localeCode)))}</link>`,
    `<description>${escapeXml(metadata.description)}</description>`,
    `<language>${escapeXml(localeCode)}</language>`,
    `<atom:link href="${escapeXml(absoluteSiteUrl(rssPath(localeCode)))}" rel="self" type="application/rss+xml" />`,
  ];

  if (latestModification) {
    channelLines.push(`<lastBuildDate>${latestModification.toUTCString()}</lastBuildDate>`);
  }

  channelLines.push(...sortedPosts.map(renderRssItem));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    ...channelLines.map((line) => indent(line)),
    '</channel>',
    '</rss>',
    '',
  ].join('\n');
}

function renderRssItem(post: PublishedPostVariant): string {
  const publicUrl = absoluteSiteUrl(articlePath(post.localeCode, post.articleKeyPath));
  const lines = [
    '<item>',
    indent(`<title>${escapeXml(post.title)}</title>`),
    indent(`<link>${escapeXml(publicUrl)}</link>`),
    indent(`<guid isPermaLink="true">${escapeXml(publicUrl)}</guid>`),
    indent(`<pubDate>${toDate(post.publishedAt).toUTCString()}</pubDate>`),
    indent(`<description>${escapeXml(post.description)}</description>`),
    ...post.tags.map((tag) => indent(`<category>${escapeXml(tag)}</category>`)),
    '</item>',
  ];

  return lines.join('\n');
}

function toDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`无法序列化文章日期：“${String(value)}”`);
  }

  return date;
}

function indent(value: string): string {
  return value
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}
