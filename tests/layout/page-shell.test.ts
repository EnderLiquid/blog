import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const readProjectFile = (relativePath: string): Promise<string> =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

describe('页面题头起始间距', () => {
  test('文章索引与详情页共用导航栏后的起始间距', async () => {
    const [pageShell, postsPage, articlePage] = await Promise.all([
      readProjectFile('app/components/layout/PageShell.vue'),
      readProjectFile('app/pages/[locale]/posts/index.vue'),
      readProjectFile('app/pages/[locale]/posts/[...articleKeyPath].vue'),
    ]);

    assert.match(
      pageShell,
      /--page-intro-offset: clamp\(0\.5rem, calc\(1\.5vw - 0\.045rem\), 0\.72rem\)/u,
    );
    assert.match(pageShell, /@media \(max-width: 39rem\)[\s\S]*--page-intro-offset: 0\.5rem/u);
    assert.match(
      postsPage,
      /margin: var\(--page-intro-offset\) 0 clamp\(2\.5rem, 6cqi, 4\.5rem\)/u,
    );
    assert.match(
      articlePage,
      /margin: var\(--page-intro-offset\) 0 clamp\(3rem, 7cqi, 4\.75rem\)/u,
    );
  });
});
