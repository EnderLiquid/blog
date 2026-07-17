import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PostSource } from '../../shared/content/post-source.ts';
import { postMetadataSchema } from '../../shared/content/post-schema.ts';
import { buildSiteManifest, validateSiteManifest } from '../../shared/site-manifest/build.ts';
import { createSiteBuildContext } from '../../shared/site-manifest/context.ts';
import type { SiteManifest } from '../../shared/site-manifest/model.ts';
import { createPageSeoIndexView } from '../../shared/site-projections/seo.ts';
import { createSitemapView } from '../../shared/site-projections/sitemap.ts';

const posts: PostSource[] = [
  {
    sourcePath: 'second/en.md',
    articleKeyPath: 'second',
    localeCode: 'en',
    metadata: {
      title: 'Second',
      description: 'Second post',
      publishedAt: new Date('2026-07-02T00:00:00.000Z'),
      tags: ['test'],
      draft: false,
    },
  },
  {
    sourcePath: 'first/zh-cn.md',
    articleKeyPath: 'first',
    localeCode: 'zh-cn',
    metadata: {
      title: '第一篇',
      description: '第一篇文章',
      publishedAt: new Date('2026-07-01T00:00:00.000Z'),
      tags: ['test'],
      draft: false,
    },
  },
];

const forbiddenManifestFields = [
  'title',
  'description',
  'publishedAt',
  'updatedAt',
  'tags',
  'indexability',
  'seo',
  'rss',
];

describe('文章metadata契约', () => {
  it('规范化日期并补全默认字段', () => {
    const metadata = postMetadataSchema.parse({
      title: 'Title',
      description: 'Description',
      publishedAt: '2026-07-01',
    });

    assert.ok(metadata.publishedAt instanceof Date);
    assert.deepEqual(metadata.tags, []);
    assert.equal(metadata.draft, false);
  });

  it('拒绝未知字段、重复标签和非法标签', () => {
    assert.throws(() =>
      postMetadataSchema.parse({
        title: 'Title',
        description: 'Description',
        publishedAt: '2026-07-01',
        unknown: true,
      }),
    );
    assert.throws(() =>
      postMetadataSchema.parse({
        title: 'Title',
        description: 'Description',
        publishedAt: '2026-07-01',
        tags: ['nuxt', 'nuxt'],
      }),
    );
    assert.throws(() =>
      postMetadataSchema.parse({
        title: 'Title',
        description: 'Description',
        publishedAt: '2026-07-01',
        tags: ['Nuxt'],
      }),
    );
  });
});

describe('Manifest v2确定性与职责边界', () => {
  it('输入顺序不影响Manifest和消费者投影字节内容', () => {
    const forward = buildSiteManifest({ posts });
    const reversedPosts = [...posts].reverse();
    const reversed = buildSiteManifest({ posts: reversedPosts });
    const forwardContext = createSiteBuildContext(forward, posts);
    const reversedContext = createSiteBuildContext(reversed, reversedPosts);

    assert.equal(JSON.stringify(forward), JSON.stringify(reversed));
    assert.equal(
      JSON.stringify(createPageSeoIndexView(forwardContext)),
      JSON.stringify(createPageSeoIndexView(reversedContext)),
    );
    assert.equal(
      JSON.stringify(createSitemapView(forwardContext)),
      JSON.stringify(createSitemapView(reversedContext)),
    );
  });

  it('只保存资源拓扑并拒绝旧Manifest版本', () => {
    const manifest = buildSiteManifest({ posts });

    assert.equal(manifest.version, 2);
    for (const resource of manifest.resources) {
      for (const field of forbiddenManifestFields) {
        assert.equal(field in resource, false, `${resource.id}不应包含${field}`);
      }
    }

    assert.throws(() => validateSiteManifest({ ...manifest, version: 1 }));
  });

  it('拒绝重复path、失效x-default、非HTTPS源地址和缺失RSS', () => {
    const original = buildSiteManifest({ posts });

    const duplicatePath = cloneManifest(original);
    duplicatePath.resources[1]!.path = duplicatePath.resources[0]!.path;
    assert.throws(() => validateSiteManifest(duplicatePath), /资源path重复/);

    const invalidDefault = cloneManifest(original);
    invalidDefault.localizationGroups[0]!.xDefaultPath = '/missing/';
    assert.throws(() => validateSiteManifest(invalidDefault), /x-default没有对应页面资源/);

    const insecureOrigin = cloneManifest(original);
    insecureOrigin.siteOrigin = 'http://blog.enderliquid.top';
    assert.throws(() => validateSiteManifest(insecureOrigin), /siteOrigin必须使用HTTPS/);

    const missingRss = cloneManifest(original);
    missingRss.resources = missingRss.resources.filter(
      (resource) => !(resource.kind === 'machine' && resource.id === 'machine:rss:en'),
    );
    assert.throws(() => validateSiteManifest(missingRss), /语言en的RSS资源必须恰好有一个/);
  });

  it('构建上下文拒绝缺少来源或缺少资源的文章映射', () => {
    const manifest = buildSiteManifest({ posts });

    assert.throws(() => createSiteBuildContext(manifest, posts.slice(1)), /找不到对应.*文章来源/);
    assert.throws(
      () =>
        createSiteBuildContext(manifest, [
          ...posts,
          {
            ...posts[0]!,
            articleKeyPath: 'missing-resource',
            sourcePath: 'missing-resource/en.md',
          },
        ]),
      /没有对应Manifest资源/,
    );
  });

  it('PageSeoView与SitemapView共享完全相同的语言关系', () => {
    const manifest = buildSiteManifest({ posts });
    const context = createSiteBuildContext(manifest, posts);
    const seoIndex = createPageSeoIndexView(context);
    const sitemap = createSitemapView(context);
    const path = '/zh-cn/posts/first/';
    const sitemapEntry = sitemap.find((entry) => entry.url.endsWith(path));

    assert.deepEqual(sitemapEntry?.languageAlternates, seoIndex[path]?.languageAlternates);
  });
});

function cloneManifest(manifest: SiteManifest): SiteManifest {
  return structuredClone(manifest);
}
