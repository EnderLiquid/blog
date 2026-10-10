import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { aboutPath } from '../../shared/routing/localized-routes.ts';
import type { ArticleDeliveryIndexView } from '../../shared/site-projections/model.ts';
import {
  createLocaleNavigationTargets,
  resolvePrimaryNavigationSection,
} from '../../app/utils/site-navigation.ts';

/** 纯内存投影样本，不读取或依赖content/posts中的真实文章。 */
const articleDeliveryIndex: ArticleDeliveryIndexView = {
  '/zh-cn/posts/fixtures/sample-article/': {
    path: '/zh-cn/posts/fixtures/sample-article/',
    articleKeyPath: 'fixtures/sample-article',
    interfaceLocaleCode: 'zh-cn',
    contentLocaleCode: 'zh-cn',
    contentPath: '/posts/fixtures/sample-article/zh-cn',
    readingTimeMinutes: 2,
    fallback: false,
  },
  '/en/posts/fixtures/sample-article/': {
    path: '/en/posts/fixtures/sample-article/',
    articleKeyPath: 'fixtures/sample-article',
    interfaceLocaleCode: 'en',
    contentLocaleCode: 'en',
    contentPath: '/posts/fixtures/sample-article/en',
    readingTimeMinutes: 3,
    fallback: false,
  },
  '/zh-cn/posts/fixtures/fallback-article/': {
    path: '/zh-cn/posts/fixtures/fallback-article/',
    articleKeyPath: 'fixtures/fallback-article',
    interfaceLocaleCode: 'zh-cn',
    contentLocaleCode: 'zh-cn',
    contentPath: '/posts/fixtures/fallback-article/zh-cn',
    readingTimeMinutes: 1,
    fallback: false,
  },
  '/en/posts/fixtures/fallback-article/': {
    path: '/en/posts/fixtures/fallback-article/',
    articleKeyPath: 'fixtures/fallback-article',
    interfaceLocaleCode: 'en',
    contentLocaleCode: 'zh-cn',
    contentPath: '/posts/fixtures/fallback-article/zh-cn',
    readingTimeMinutes: 1,
    fallback: true,
  },
};

describe('顶部主导航', () => {
  it('将首页、文章和About页面映射到对应主导航分区', () => {
    assert.equal(resolvePrimaryNavigationSection('/zh-cn/'), 'home');
    assert.equal(resolvePrimaryNavigationSection('/en/posts/'), 'posts');
    assert.equal(resolvePrimaryNavigationSection('/zh-cn/posts/fixtures/sample-article/'), 'posts');
    assert.equal(resolvePrimaryNavigationSection('/en/about/'), 'about');
    assert.equal(aboutPath('zh-cn'), '/zh-cn/about/');
    assert.equal(aboutPath('en'), '/en/about/');
  });
});

describe('顶部语言菜单', () => {
  it('普通页面切换语言时保留query与Hash', () => {
    const targets = createLocaleNavigationTargets(
      '/zh-cn/posts/?q=nuxt&sort=oldest#result',
      articleDeliveryIndex,
    );
    const english = targets.find((target) => target.localeCode === 'en');
    const aboutTargets = createLocaleNavigationTargets(
      '/zh-cn/about/?from=profile#links',
      articleDeliveryIndex,
    );
    const englishAbout = aboutTargets.find((target) => target.localeCode === 'en');

    assert.equal(english?.available, true);
    assert.equal(english?.path, '/en/posts/?q=nuxt&sort=oldest#result');
    assert.equal(englishAbout?.path, '/en/about/?from=profile#links');
  });

  it('真实文章详情切换界面语言时保留query与Hash', () => {
    const targets = createLocaleNavigationTargets(
      '/zh-cn/posts/fixtures/sample-article/?from=feed#comments',
      articleDeliveryIndex,
    );
    const english = targets.find((target) => target.localeCode === 'en');

    assert.equal(english?.path, '/en/posts/fixtures/sample-article/?from=feed#comments');
  });

  it('缺少译文时仍生成按网站优先级排列的回退投递目标', () => {
    const targets = createLocaleNavigationTargets(
      '/zh-cn/posts/fixtures/fallback-article/',
      articleDeliveryIndex,
    );
    const english = targets.find((target) => target.localeCode === 'en');

    assert.deepEqual(
      targets.map((target) => target.localeCode),
      ['zh-cn', 'en'],
    );
    assert.equal(english?.available, true);
    assert.equal(english?.path, '/en/posts/fixtures/fallback-article/');
  });
});
