import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSiteManifest, type PostSource } from '../../shared/site-manifest/build.ts';
import {
  createPageSeoIndexView,
  createPrerenderRoutesView,
  createRobotsView,
  createRssView,
  createSitemapView,
} from '../../shared/site-manifest/views.ts';
import { SITE_ORIGIN } from '../../shared/site/config.ts';
import { escapeXml } from '../../shared/xml/escape.ts';
import { renderRobotsTxt } from '../../server/utils/robots.ts';
import { renderRssFeed } from '../../server/utils/rss.ts';
import { renderSitemap } from '../../server/utils/sitemap.ts';

const englishPost: PostSource = {
  sourcePath: 'examples/xml-and-rss/en.md',
  articleKeyPath: 'examples/xml-and-rss',
  localeCode: 'en',
  metadata: {
    title: 'XML & RSS <notes>',
    description: 'A "short" summary, not the full body.',
    publishedAt: new Date('2026-07-12T00:00:00.000Z'),
    updatedAt: new Date('2026-07-14T00:00:00.000Z'),
    tags: ['nuxt', 'rss'],
    draft: false,
  },
};

const chinesePost: PostSource = {
  sourcePath: 'examples/xml-and-rss/zh-cn.md',
  articleKeyPath: 'examples/xml-and-rss',
  localeCode: 'zh-cn',
  metadata: {
    ...englishPost.metadata,
    title: 'XML 与 RSS',
    description: '只包含摘要。',
  },
};

const manifest = buildSiteManifest({ posts: [englishPost, chinesePost] });

describe('站点资源清单', () => {
  it('展开静态页面、文章和机器资源，并建立语言关系', () => {
    const routes = createPrerenderRoutesView(manifest);
    const articleGroup = manifest.localizationGroups.find(
      (group) => group.id === 'article:examples/xml-and-rss',
    );

    assert.ok(routes.includes('/'));
    assert.ok(routes.includes('/404.html'));
    assert.ok(routes.includes('/en/posts/examples/xml-and-rss/'));
    assert.ok(routes.includes('/zh-cn/rss.xml'));
    assert.deepEqual(articleGroup?.memberResourceIds, [
      'article:examples/xml-and-rss:zh-cn',
      'article:examples/xml-and-rss:en',
    ]);
    assert.equal(articleGroup?.xDefaultPath, '/zh-cn/posts/examples/xml-and-rss/');
  });

  it('排除草稿公开资源，但仍接受它作为已校验来源', () => {
    const draftManifest = buildSiteManifest({
      posts: [
        {
          ...englishPost,
          metadata: { ...englishPost.metadata, draft: true },
        },
      ],
    });

    assert.equal(
      draftManifest.resources.some((resource) => resource.kind === 'article-page'),
      false,
    );
  });

  it('拒绝同一文章各语言使用不同标签', () => {
    assert.throws(
      () =>
        buildSiteManifest({
          posts: [
            englishPost,
            {
              ...chinesePost,
              metadata: { ...chinesePost.metadata, tags: ['other'] },
            },
          ],
        }),
      /各语言版本的标签必须一致/,
    );
  });
});

describe('站点源地址与XML转义', () => {
  it('清单使用唯一生产源地址', () => {
    assert.equal(SITE_ORIGIN, 'https://blog.enderliquid.top');
    assert.equal(manifest.siteOrigin, SITE_ORIGIN);
  });

  it('转义文本和属性中的五个保留字符', () => {
    assert.equal(escapeXml(`&<>"'`), '&amp;&lt;&gt;&quot;&apos;');
  });
});

describe('PageSeoView', () => {
  it('为文章生成canonical、实际语言版本、x-default和当前语言RSS', () => {
    const seoIndex = createPageSeoIndexView(manifest);
    const seo = seoIndex['/en/posts/examples/xml-and-rss/'];

    assert.equal(seo?.canonicalUrl, 'https://blog.enderliquid.top/en/posts/examples/xml-and-rss/');
    assert.deepEqual(
      seo?.languageAlternates.map((alternate) => alternate.localeCode),
      ['zh-cn', 'en', 'x-default'],
    );
    assert.deepEqual(
      seo?.feeds.map((feed) => feed.localeCode),
      ['en'],
    );
  });

  it('根入口声明两个RSS，404不声明canonical、alternate或RSS', () => {
    const seoIndex = createPageSeoIndexView(manifest);

    assert.deepEqual(
      seoIndex['/']?.feeds.map((feed) => feed.localeCode),
      ['zh-cn', 'en'],
    );
    assert.equal(seoIndex['/404.html']?.canonicalUrl, undefined);
    assert.deepEqual(seoIndex['/404.html']?.languageAlternates, []);
    assert.deepEqual(seoIndex['/404.html']?.feeds, []);
  });
});

describe('RSS', () => {
  it('输出摘要、稳定GUID、文章链接、日期、标签和Atom self link', () => {
    const rss = renderRssFeed(createRssView(manifest, 'en'));

    assert.match(rss, /<rss version="2\.0"/);
    assert.match(rss, /XML &amp; RSS &lt;notes&gt;/);
    assert.match(rss, /A &quot;short&quot; summary, not the full body\./);
    assert.match(
      rss,
      /<guid isPermaLink="false">enderliquid:post:en:examples\/xml-and-rss<\/guid>/,
    );
    assert.match(
      rss,
      /<link>https:\/\/blog\.enderliquid\.top\/en\/posts\/examples\/xml-and-rss\/<\/link>/,
    );
    assert.match(rss, /<pubDate>Sun, 12 Jul 2026 00:00:00 GMT<\/pubDate>/);
    assert.match(rss, /<lastBuildDate>Tue, 14 Jul 2026 00:00:00 GMT<\/lastBuildDate>/);
    assert.match(rss, /<category>rss<\/category>/);
    assert.match(
      rss,
      /<atom:link href="https:\/\/blog\.enderliquid\.top\/en\/rss\.xml" rel="self"/,
    );
    assert.doesNotMatch(rss, /只包含摘要/);
  });

  it('生产域名变化时保留GUID，只更新可访问链接', () => {
    const migratedManifest = buildSiteManifest({
      posts: [englishPost, chinesePost],
      siteOrigin: 'https://enderliquid.com',
    });
    const originalItem = createRssView(manifest, 'en').items[0];
    const migratedItem = createRssView(migratedManifest, 'en').items[0];

    assert.ok(originalItem);
    assert.ok(migratedItem);
    assert.equal(migratedItem.guid, originalItem.guid);
    assert.equal(migratedItem.url, 'https://enderliquid.com/en/posts/examples/xml-and-rss/');
    assert.notEqual(migratedItem.url, originalItem.url);
  });
});

describe('Sitemap与robots', () => {
  it('输出可索引页面、文章lastmod和共享的多语言关系', () => {
    const sitemap = renderSitemap(createSitemapView(manifest));

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
    assert.doesNotMatch(sitemap, /404\.html|priority|changefreq/);
  });

  it('允许全站抓取并声明清单中的绝对Sitemap URL', () => {
    assert.equal(
      renderRobotsTxt(createRobotsView(manifest)),
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
