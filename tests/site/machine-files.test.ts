import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PostSource } from '../../shared/content/post-source.ts';
import { RSS_FEED_DEFINITIONS, RSS_ITEM_GUID_PREFIX } from '../../shared/site-definitions/rss.ts';
import { buildSiteManifest } from '../../shared/site-manifest/build.ts';
import { createSiteBuildContext } from '../../shared/site-manifest/context.ts';
import { createPrerenderRoutesView } from '../../shared/site-projections/prerender.ts';
import { createRobotsView } from '../../shared/site-projections/robots.ts';
import { createRssView } from '../../shared/site-projections/rss.ts';
import { createPageSeoIndexView } from '../../shared/site-projections/seo.ts';
import { createSitemapView } from '../../shared/site-projections/sitemap.ts';
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

const posts = [englishPost, chinesePost];
const manifest = buildSiteManifest({ posts });
const context = createSiteBuildContext(manifest, posts);

function configuredSiteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}

describe('站点资源清单', () => {
  it('展开静态页面、文章和机器资源，并建立语言关系', () => {
    const routes = createPrerenderRoutesView(manifest);
    const articleGroup = manifest.localizationGroups.find(
      (group) => group.id === 'article:examples/xml-and-rss',
    );
    const aboutGroup = manifest.localizationGroups.find((group) => group.id === 'page:about');

    assert.ok(routes.includes('/'));
    assert.ok(routes.includes('/404.html'));
    assert.ok(routes.includes('/zh-cn/about/'));
    assert.ok(routes.includes('/en/about/'));
    assert.ok(routes.includes('/en/posts/examples/xml-and-rss/'));
    assert.ok(routes.includes('/zh-cn/rss.xml'));
    assert.deepEqual(articleGroup?.memberResourceIds, [
      'article:examples/xml-and-rss:zh-cn',
      'article:examples/xml-and-rss:en',
    ]);
    assert.equal(articleGroup?.xDefaultPath, '/zh-cn/posts/examples/xml-and-rss/');
    assert.deepEqual(aboutGroup?.memberResourceIds, ['page:about:zh-cn', 'page:about:en']);
    assert.equal(aboutGroup?.xDefaultPath, '/zh-cn/about/');
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
  it('清单采用唯一生产源地址', () => {
    assert.equal(manifest.siteOrigin, SITE_ORIGIN);
  });

  it('转义文本和属性中的五个保留字符', () => {
    assert.equal(escapeXml(`&<>"'`), '&amp;&lt;&gt;&quot;&apos;');
  });
});

describe('PageSeoView', () => {
  it('为文章生成canonical、实际语言版本、x-default和当前语言RSS', () => {
    const seoIndex = createPageSeoIndexView(context);
    const seo = seoIndex['/en/posts/examples/xml-and-rss/'];

    assert.equal(seo?.title, englishPost.metadata.title);
    assert.equal(seo?.description, englishPost.metadata.description);
    assert.equal(seo?.canonicalUrl, configuredSiteUrl('/en/posts/examples/xml-and-rss/'));
    assert.deepEqual(
      seo?.languageAlternates.map((alternate) => alternate.localeCode),
      ['zh-cn', 'en', 'x-default'],
    );
    assert.deepEqual(
      seo?.feeds.map((feed) => feed.localeCode),
      ['en'],
    );
    assert.equal(seo?.feeds[0]?.title, RSS_FEED_DEFINITIONS.en.title);
  });

  it('为About生成独立SEO和完整语言关系', () => {
    const seoIndex = createPageSeoIndexView(context);
    const about = seoIndex['/zh-cn/about/'];

    assert.equal(about?.title, '关于 EnderLiquid');
    assert.equal(about?.description, '软件工程本科在读，Java母语者。');
    assert.equal(about?.indexability, 'index');
    assert.equal(about?.canonicalUrl, configuredSiteUrl('/zh-cn/about/'));
    assert.deepEqual(
      about?.languageAlternates.map((alternate) => alternate.localeCode),
      ['zh-cn', 'en', 'x-default'],
    );
    assert.deepEqual(
      about?.feeds.map((feed) => feed.localeCode),
      ['zh-cn'],
    );
  });

  it('根入口声明两个RSS，404不声明canonical、alternate或RSS', () => {
    const seoIndex = createPageSeoIndexView(context);

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
    const rssView = createRssView(context, 'en');
    const rss = renderRssFeed(rssView);

    assert.equal(rssView.title, RSS_FEED_DEFINITIONS.en.title);
    assert.match(rss, /<rss version="2\.0"/);
    assert.match(rss, /XML &amp; RSS &lt;notes&gt;/);
    assert.match(rss, /A &quot;short&quot; summary, not the full body\./);
    assert.ok(
      rss.includes(
        `<guid isPermaLink="false">${RSS_ITEM_GUID_PREFIX}:en:examples/xml-and-rss</guid>`,
      ),
    );
    assert.ok(rss.includes(`<link>${configuredSiteUrl('/en/posts/examples/xml-and-rss/')}</link>`));
    assert.match(rss, /<pubDate>Sun, 12 Jul 2026 00:00:00 GMT<\/pubDate>/);
    assert.match(rss, /<lastBuildDate>Tue, 14 Jul 2026 00:00:00 GMT<\/lastBuildDate>/);
    assert.match(rss, /<category>rss<\/category>/);
    assert.ok(
      rss.includes(
        `<atom:link href="${configuredSiteUrl('/en/rss.xml')}" rel="self" type="application/rss+xml" />`,
      ),
    );
    assert.doesNotMatch(rss, /只包含摘要/);
  });

  it('回退投递页面不会进入缺失语言RSS', () => {
    const singleLanguagePosts = [chinesePost];
    const singleLanguageManifest = buildSiteManifest({ posts: singleLanguagePosts });
    const singleLanguageContext = createSiteBuildContext(
      singleLanguageManifest,
      singleLanguagePosts,
    );

    assert.equal(createRssView(singleLanguageContext, 'en').items.length, 0);
    assert.deepEqual(
      createRssView(singleLanguageContext, 'zh-cn').items.map((item) => item.articleKeyPath),
      ['examples/xml-and-rss'],
    );
  });

  it('生产域名变化时保留GUID，只更新可访问链接', () => {
    const migratedManifest = buildSiteManifest({
      posts,
      siteOrigin: 'https://enderliquid.com',
    });
    const migratedContext = createSiteBuildContext(migratedManifest, posts);
    const originalItem = createRssView(context, 'en').items[0];
    const migratedItem = createRssView(migratedContext, 'en').items[0];

    assert.ok(originalItem);
    assert.ok(migratedItem);
    assert.equal(migratedItem.guid, originalItem.guid);
    assert.equal(migratedItem.url, 'https://enderliquid.com/en/posts/examples/xml-and-rss/');
    assert.notEqual(migratedItem.url, originalItem.url);
  });
});

describe('Sitemap与robots', () => {
  it('输出可索引页面、文章lastmod和共享的多语言关系', () => {
    const sitemap = renderSitemap(createSitemapView(context));

    assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
    assert.ok(sitemap.includes(`<loc>${configuredSiteUrl('/zh-cn/')}</loc>`));
    assert.ok(sitemap.includes(`<loc>${configuredSiteUrl('/en/posts/')}</loc>`));
    assert.ok(sitemap.includes(`<loc>${configuredSiteUrl('/en/about/')}</loc>`));
    assert.ok(
      sitemap.includes(`<loc>${configuredSiteUrl('/en/posts/examples/xml-and-rss/')}</loc>`),
    );
    assert.match(sitemap, /<lastmod>2026-07-14<\/lastmod>/);
    assert.match(sitemap, /hreflang="zh-cn"/);
    assert.match(sitemap, /hreflang="en"/);
    assert.match(sitemap, /hreflang="x-default"/);
    assert.ok(!sitemap.includes(`<loc>${configuredSiteUrl('/')}</loc>`));
    assert.doesNotMatch(sitemap, /404\.html|priority|changefreq/);
  });

  it('Sitemap只包含单语言文章的真实页面', () => {
    const singleLanguagePosts = [chinesePost];
    const singleLanguageManifest = buildSiteManifest({ posts: singleLanguagePosts });
    const singleLanguageContext = createSiteBuildContext(
      singleLanguageManifest,
      singleLanguagePosts,
    );
    const sitemap = createSitemapView(singleLanguageContext);

    assert.equal(
      sitemap.some((entry) => entry.url.endsWith('/zh-cn/posts/examples/xml-and-rss/')),
      true,
    );
    assert.equal(
      sitemap.some((entry) => entry.url.endsWith('/en/posts/examples/xml-and-rss/')),
      false,
    );
  });

  it('允许全站抓取并声明清单中的绝对Sitemap URL', () => {
    assert.equal(
      renderRobotsTxt(createRobotsView(manifest)),
      ['User-agent: *', 'Allow: /', '', `Sitemap: ${configuredSiteUrl('/sitemap.xml')}`, ''].join(
        '\n',
      ),
    );
  });
});
