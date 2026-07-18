import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createArticleDiscussionTerm,
  GISCUS_CONFIG,
  toGiscusLanguage,
} from '../../shared/comments/giscus.ts';
import { SITE_ORIGIN } from '../../shared/site/config.ts';

describe('Giscus文章映射', () => {
  it('使用与语言和域名无关的文章身份', () => {
    assert.equal(
      createArticleDiscussionTerm('examples/hello-world'),
      'article:examples/hello-world',
    );
    assert.equal(
      createArticleDiscussionTerm('/examples/hello-world/'),
      'article:examples/hello-world',
    );
  });

  it('拒绝空文章身份', () => {
    assert.throws(() => createArticleDiscussionTerm('///'), /articleKeyPath 不能为空/);
  });

  it('固定评论行为并从生产源地址加载自定义主题', () => {
    assert.equal(GISCUS_CONFIG.mapping, 'specific');
    assert.equal(GISCUS_CONFIG.strict, '1');
    assert.equal(GISCUS_CONFIG.reactionsEnabled, '0');
    assert.equal(GISCUS_CONFIG.theme, `${SITE_ORIGIN}/giscus-theme.css`);
  });
});

describe('Giscus语言适配', () => {
  it('只在组件边界转换中文语言标签', () => {
    assert.equal(toGiscusLanguage('zh-cn'), 'zh-CN');
    assert.equal(toGiscusLanguage('en'), 'en');
  });
});
