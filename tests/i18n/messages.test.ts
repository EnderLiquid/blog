import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SITE_MESSAGES } from '../../shared/i18n/messages.ts';

describe('文章统计文案', () => {
  it('生成完整的阅读时间文案', () => {
    assert.equal(SITE_MESSAGES['zh-cn'].article.readingTime(7), '阅读时间 7 分钟');
    assert.equal(SITE_MESSAGES.en.article.readingTime(7), '7 min read');
  });

  it('生成访问量文案并按英文数量选择单复数', () => {
    assert.equal(SITE_MESSAGES['zh-cn'].article.views(10), '访问量 10');
    assert.equal(SITE_MESSAGES.en.article.views(10), '10 views');
    assert.equal(SITE_MESSAGES.en.article.views(1), '1 view');
  });

  it('计数尚未加载时显示加载占位', () => {
    assert.equal(SITE_MESSAGES['zh-cn'].article.views(undefined), '访问量 …');
    assert.equal(SITE_MESSAGES.en.article.views(undefined), '… views');
  });

  it('按界面语言给计数添加千分位分组', () => {
    assert.equal(SITE_MESSAGES['zh-cn'].article.views(1234), '访问量 1,234');
    assert.equal(SITE_MESSAGES.en.article.views(1234), '1,234 views');
  });
});
