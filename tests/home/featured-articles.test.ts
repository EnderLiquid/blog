import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PostSource } from '../../shared/content/post-source.ts';
import {
  FEATURED_ARTICLE_KEYS,
  validateFeaturedArticleKeys,
} from '../../shared/site-definitions/home.ts';

const publishedPost = createPostSource('examples/hello-world', false);
const translatedPost = createPostSource('examples/hello-world', false, 'en');
const secondPost = createPostSource('notes/second', false);
const thirdPost = createPostSource('notes/third', false);

function createPostSource(
  articleKeyPath: string,
  draft: boolean,
  localeCode: PostSource['localeCode'] = 'zh-cn',
): PostSource {
  return {
    sourcePath: `content/posts/${articleKeyPath}/${localeCode}.md`,
    articleKeyPath,
    localeCode,
    metadata: {
      title: articleKeyPath,
      description: articleKeyPath,
      publishedAt: '2026-07-23',
      tags: [],
      draft,
    },
  };
}

describe('首页精选文章配置', () => {
  it('初始只精选环境示例文章', () => {
    assert.deepEqual(FEATURED_ARTICLE_KEYS, ['examples/hello-world']);
  });

  it('接受零到三篇并把多语言来源视为同一逻辑文章', () => {
    assert.doesNotThrow(() => validateFeaturedArticleKeys([], [publishedPost]));
    assert.doesNotThrow(() =>
      validateFeaturedArticleKeys(
        ['examples/hello-world', 'notes/second', 'notes/third'],
        [publishedPost, translatedPost, secondPost, thirdPost],
      ),
    );
  });

  it('拒绝超过上限、重复和非法路径', () => {
    assert.throws(
      () =>
        validateFeaturedArticleKeys(
          ['examples/hello-world', 'notes/second', 'notes/third', 'notes/fourth'],
          [publishedPost, secondPost, thirdPost, createPostSource('notes/fourth', false)],
        ),
      /最多配置3篇/u,
    );
    assert.throws(
      () =>
        validateFeaturedArticleKeys(
          ['examples/hello-world', 'examples/hello-world'],
          [publishedPost],
        ),
      /重复配置/u,
    );
    assert.throws(
      () => validateFeaturedArticleKeys(['/examples/hello-world'], [publishedPost]),
      /路径不合法/u,
    );
  });

  it('拒绝不存在和只有草稿来源的文章', () => {
    assert.throws(() => validateFeaturedArticleKeys(['missing-post'], [publishedPost]), /不存在/u);
    assert.throws(
      () =>
        validateFeaturedArticleKeys(
          ['notes/draft-only'],
          [createPostSource('notes/draft-only', true)],
        ),
      /不能只包含草稿/u,
    );
  });
});
