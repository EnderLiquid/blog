import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PublishedPostVariant } from '../../server/utils/published-posts';
import { renderRobotsTxt } from '../../server/utils/robots.ts';
import { renderRssFeed } from '../../server/utils/rss.ts';
import { renderSitemap } from '../../server/utils/sitemap.ts';
import { absoluteSiteUrl, SITE_ORIGIN } from '../../shared/site/config.ts';
import { escapeXml } from '../../shared/xml/escape.ts';

const englishPost: PublishedPostVariant = {
  articleKeyPath: 'examples/xml-and-rss',
  localeCode: 'en',
  path: '/en/posts/examples/xml-and-rss/',
  title: 'XML & RSS <notes>',
  description: 'A "short" summary, not the full body.',
  publishedAt: '2026-07-12T00:00:00.000Z',
  updatedAt: '2026-07-14T00:00:00.000Z',
  tags: ['nuxt', 'rss'],
};

const chinesePost: PublishedPostVariant = {
  ...englishPost,
  localeCode: 'zh-cn',
  path: '/zh-cn/posts/examples/xml-and-rss/',
  title: 'XML 与 RSS',
  description: '只包含摘要。',
};

describe('站点 URL', () => {
  it('从唯一生产源地址生成绝对 URL', () => {
    assert.equal(SITE_ORIGIN, 'https://blog.enderliquid.top');
    assert.equal(absoluteSiteUrl('/zh-cn/posts/'), 'https://blog.enderliquid.top/zh-cn/posts/');
  });

  it('拒绝没有根斜杠的相对路径', () => {
    assert.throws(() => absoluteSiteUrl('zh-cn/posts/'), /必须以斜杠开头/);
  });
});

describe('XML 转义', () => {
  it('转义文本和属性中的五个保留字符', () => {
    assert.equal(escapeXml(`&<>"'`), '&amp;&lt;&gt;&quot;&apos;');
  });
});

describe('RSS', () => {
  it('输出摘要、永久链接、日期、标签和 Atom self link', () => {
    const rss = renderRssFeed('en', [englishPost]);

    assert.match(rss, /<rss version="2\.0"/);
    assert.match(rss, /XML &amp; RSS &lt;notes&gt;/);
    assert.match(rss, /A &quot;short&quot; summary, not the full body\./);
    assert.match(rss, /<guid isPermaLink="true">https:\/\/blog\.enderliquid\.top\/en\/posts\//);
    assert.match(rss, /<pubDate>Sun, 12 Jul 2026 00:00:00 GMT<\/pubDate>/);
    assert.match(rss, /<lastBuildDate>Tue, 14 Jul 2026 00:00:00 GMT<\/lastBuildDate>/);
    assert.match(rss, /<category>rss<\/category>/);
    assert.match(
      rss,
      /<atom:link href="https:\/\/blog\.enderliquid\.top\/en\/rss\.xml" rel="self"/,
    );
  });

  it('拒绝把其他语言文章写入当前订阅源', () => {
    assert.throws(() => renderRssFeed('en', [chinesePost]), /收到了 zh-cn 文章/);
  });
});

describe('Sitemap 与 robots', () => {
  it('输出静态页面、文章版本、lastmod和多语言关系', () => {
    const sitemap = renderSitemap([englishPost, chinesePost]);

    assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
    assert.match(sitemap, /<loc>https:\/\/blog\.enderliquid\.top\/zh-cn\/<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/blog\.enderliquid\.top\/en\/posts\/<\/loc>/);
    assert.match(
      sitemap,
      /<loc>https:\/\/blog\.enderliquid\.top\/en\/posts\/examples\/xml-and-rss\/<\/loc>/,
    );
    assert.match(sitemap, /<lastmod>2026-07-14<\/lastmod>/);
    assert.match(sitemap, /hreflang="zh-cn"/);
    assert.match(sitemap, /hreflang="en"/);
    assert.match(sitemap, /hreflang="x-default"/);
    assert.doesNotMatch(sitemap, /<loc>https:\/\/blog\.enderliquid\.top\/<\/loc>/);
    assert.doesNotMatch(sitemap, /priority|changefreq/);
  });

  it('允许全站抓取并声明绝对 Sitemap URL', () => {
    assert.equal(
      renderRobotsTxt(),
      [
        'User-agent: *',
        'Allow: /',
        '',
        'Sitemap: https://blog.enderliquid.top/sitemap.xml',
        '',
      ].join('\n'),
    );
  });
});
