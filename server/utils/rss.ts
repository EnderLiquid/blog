import { escapeXml } from '../../shared/xml/escape.ts';
import type { RssChannelView, RssItemView } from '../../shared/site-manifest/views.ts';

/** 将已经完成语言过滤和排序的摘要视图序列化为 RSS 2.0。 */
export function renderRssFeed(channel: RssChannelView): string {
  const latestModification = channel.items.reduce<Date | undefined>((latest, item) => {
    const candidate = toDate(item.updatedAt ?? item.publishedAt);
    return !latest || candidate > latest ? candidate : latest;
  }, undefined);
  const channelLines = [
    `<title>${escapeXml(channel.title)}</title>`,
    `<link>${escapeXml(channel.homeUrl)}</link>`,
    `<description>${escapeXml(channel.description)}</description>`,
    `<language>${escapeXml(channel.localeCode)}</language>`,
    `<atom:link href="${escapeXml(channel.selfUrl)}" rel="self" type="application/rss+xml" />`,
  ];

  if (latestModification) {
    channelLines.push(`<lastBuildDate>${latestModification.toUTCString()}</lastBuildDate>`);
  }

  channelLines.push(...channel.items.map(renderRssItem));

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

function renderRssItem(item: RssItemView): string {
  const lines = [
    '<item>',
    indent(`<title>${escapeXml(item.title)}</title>`),
    indent(`<link>${escapeXml(item.url)}</link>`),
    indent(`<guid isPermaLink="true">${escapeXml(item.url)}</guid>`),
    indent(`<pubDate>${toDate(item.publishedAt).toUTCString()}</pubDate>`),
    indent(`<description>${escapeXml(item.description)}</description>`),
    ...item.tags.map((tag) => indent(`<category>${escapeXml(tag)}</category>`)),
    '</item>',
  ];

  return lines.join('\n');
}

function toDate(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`无法序列化文章日期：“${value}”`);
  }

  return date;
}

function indent(value: string): string {
  return value
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}
