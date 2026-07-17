import { escapeXml } from '../../shared/xml/escape.ts';
import type { SitemapEntryView } from '../../shared/site-projections/model.ts';

/** 将已经完成索引过滤和语言分组的视图序列化为Sitemap XML。 */
export function renderSitemap(entries: readonly SitemapEntryView[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.map((entry) => indent(renderUrlEntry(entry))),
    '</urlset>',
    '',
  ].join('\n');
}

function renderUrlEntry(entry: SitemapEntryView): string {
  const lines = ['<url>', indent(`<loc>${escapeXml(entry.url)}</loc>`)];

  if (entry.lastModified) {
    lines.push(indent(`<lastmod>${formatLastModified(entry.lastModified)}</lastmod>`));
  }

  for (const alternate of entry.languageAlternates) {
    lines.push(
      indent(
        `<xhtml:link rel="alternate" hreflang="${escapeXml(alternate.localeCode)}" ` +
          `href="${escapeXml(alternate.url)}" />`,
      ),
    );
  }

  lines.push('</url>');
  return lines.join('\n');
}

function formatLastModified(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`无法序列化Sitemap日期：“${value}”`);
  }

  return date.toISOString().slice(0, 10);
}

function indent(value: string): string {
  return value
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}
