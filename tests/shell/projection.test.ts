import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PostSource } from '../../shared/content/post-source.ts';
import { buildSiteManifest } from '../../shared/site-manifest/build.ts';
import { createSiteBuildContext } from '../../shared/site-manifest/context.ts';
import { createShellNavigationProjection } from '../../shared/site-projections/shell.ts';

/** 纯内存文章来源样本，不读取或依赖content/posts中的真实文章。 */
const posts: PostSource[] = [
  {
    sourcePath: 'fixtures/sample-article/zh-cn.md',
    articleKeyPath: 'fixtures/sample-article',
    localeCode: 'zh-cn',
    metadata: {
      title: '中文测试文章',
      description: '中文样本',
      publishedAt: new Date('2026-07-01T00:00:00.000Z'),
      tags: [],
      draft: false,
    },
  },
  {
    sourcePath: 'fixtures/sample-article/en.md',
    articleKeyPath: 'fixtures/sample-article',
    localeCode: 'en',
    metadata: {
      title: 'English fixture post',
      description: 'English sample',
      publishedAt: new Date('2026-07-01T00:00:00.000Z'),
      tags: [],
      draft: false,
    },
  },
  {
    sourcePath: 'fixtures/fallback-article/zh-cn.md',
    articleKeyPath: 'fixtures/fallback-article',
    localeCode: 'zh-cn',
    metadata: {
      title: '仅中文测试文章',
      description: '单语言样本',
      publishedAt: new Date('2026-07-02T00:00:00.000Z'),
      tags: [],
      draft: false,
    },
  },
  {
    sourcePath: 'fixtures/draft-article/zh-cn.md',
    articleKeyPath: 'fixtures/draft-article',
    localeCode: 'zh-cn',
    metadata: {
      title: '草稿测试文章',
      description: '草稿样本',
      publishedAt: new Date('2026-07-02T00:00:00.000Z'),
      tags: [],
      draft: true,
    },
  },
];

describe('Shell导航投影', () => {
  it('只投影本地化首页、About、文章列表和非草稿文章', () => {
    const manifest = buildSiteManifest({ posts });
    const projection = createShellNavigationProjection(createSiteBuildContext(manifest, posts));

    assert.equal(projection.version, 1);
    assert.deepEqual(
      projection.resources.map((resource) => [
        resource.localeCode,
        resource.virtualPath,
        resource.kind,
      ]),
      [
        ['zh-cn', '/', 'home'],
        ['zh-cn', '/about/', 'about'],
        ['zh-cn', '/posts/', 'posts'],
        ['zh-cn', '/posts/fixtures/fallback-article/', 'article'],
        ['zh-cn', '/posts/fixtures/sample-article/', 'article'],
        ['en', '/', 'home'],
        ['en', '/about/', 'about'],
        ['en', '/posts/', 'posts'],
        ['en', '/posts/fixtures/fallback-article/', 'article'],
        ['en', '/posts/fixtures/sample-article/', 'article'],
      ],
    );
    assert.equal(
      projection.resources.find(
        (resource) => resource.localeCode === 'zh-cn' && resource.kind === 'article',
      )?.title,
      '仅中文测试文章',
    );
    assert.equal(
      projection.resources.find(
        (resource) =>
          resource.localeCode === 'en' &&
          resource.virtualPath === '/posts/fixtures/fallback-article/',
      )?.title,
      '仅中文测试文章',
    );
    assert.equal(
      projection.resources.find(
        (resource) => resource.localeCode === 'zh-cn' && resource.kind === 'about',
      )?.navigableParentPath,
      '/',
    );
    assert.equal(
      projection.resources.some((resource) => resource.virtualPath.includes('draft')),
      false,
    );
  });

  it('输入顺序不影响投影', () => {
    const forwardManifest = buildSiteManifest({ posts });
    const reversePosts = [...posts].reverse();
    const reverseManifest = buildSiteManifest({ posts: reversePosts });

    assert.equal(
      JSON.stringify(
        createShellNavigationProjection(createSiteBuildContext(forwardManifest, posts)),
      ),
      JSON.stringify(
        createShellNavigationProjection(createSiteBuildContext(reverseManifest, reversePosts)),
      ),
    );
  });
});
