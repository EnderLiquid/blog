import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PostSource } from '../../shared/content/post-source.ts';
import { buildSiteManifest } from '../../shared/site-manifest/build.ts';
import { createSiteBuildContext } from '../../shared/site-manifest/context.ts';
import { createShellNavigationProjection } from '../../shared/site-projections/shell.ts';

const posts: PostSource[] = [
  {
    sourcePath: 'examples/hello-world/zh-cn.md',
    articleKeyPath: 'examples/hello-world',
    localeCode: 'zh-cn',
    metadata: {
      title: '环境已经就绪',
      description: '中文文章',
      publishedAt: new Date('2026-07-01T00:00:00.000Z'),
      tags: [],
      draft: false,
    },
  },
  {
    sourcePath: 'examples/hello-world/en.md',
    articleKeyPath: 'examples/hello-world',
    localeCode: 'en',
    metadata: {
      title: 'The environment is ready',
      description: 'English post',
      publishedAt: new Date('2026-07-01T00:00:00.000Z'),
      tags: [],
      draft: false,
    },
  },
  {
    sourcePath: 'draft/zh-cn.md',
    articleKeyPath: 'draft',
    localeCode: 'zh-cn',
    metadata: {
      title: '草稿',
      description: '草稿文章',
      publishedAt: new Date('2026-07-02T00:00:00.000Z'),
      tags: [],
      draft: true,
    },
  },
];

describe('Shell导航投影', () => {
  it('只投影本地化首页、文章列表和非草稿文章', () => {
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
        ['en', '/', 'home'],
        ['en', '/posts/', 'posts'],
        ['en', '/posts/examples/hello-world/', 'article'],
        ['zh-cn', '/', 'home'],
        ['zh-cn', '/posts/', 'posts'],
        ['zh-cn', '/posts/examples/hello-world/', 'article'],
      ],
    );
    assert.equal(
      projection.resources.find(
        (resource) => resource.localeCode === 'zh-cn' && resource.kind === 'article',
      )?.title,
      '环境已经就绪',
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
