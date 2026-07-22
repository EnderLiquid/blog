import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { aboutPath } from '../../shared/routing/localized-routes.ts';
import type { ArticleDeliveryIndexView } from '../../shared/site-projections/model.ts';
import {
  createLocaleNavigationTargets,
  resolvePrimaryNavigationSection,
} from '../../app/utils/site-navigation.ts';

const articleDeliveryIndex: ArticleDeliveryIndexView = {
  '/zh-cn/posts/examples/hello-world/': {
    path: '/zh-cn/posts/examples/hello-world/',
    articleKeyPath: 'examples/hello-world',
    interfaceLocaleCode: 'zh-cn',
    contentLocaleCode: 'zh-cn',
    contentPath: '/posts/examples/hello-world/zh-cn',
    fallback: false,
  },
  '/en/posts/examples/hello-world/': {
    path: '/en/posts/examples/hello-world/',
    articleKeyPath: 'examples/hello-world',
    interfaceLocaleCode: 'en',
    contentLocaleCode: 'en',
    contentPath: '/posts/examples/hello-world/en',
    fallback: false,
  },
  '/zh-cn/posts/examples/zh-only/': {
    path: '/zh-cn/posts/examples/zh-only/',
    articleKeyPath: 'examples/zh-only',
    interfaceLocaleCode: 'zh-cn',
    contentLocaleCode: 'zh-cn',
    contentPath: '/posts/examples/zh-only/zh-cn',
    fallback: false,
  },
  '/en/posts/examples/zh-only/': {
    path: '/en/posts/examples/zh-only/',
    articleKeyPath: 'examples/zh-only',
    interfaceLocaleCode: 'en',
    contentLocaleCode: 'zh-cn',
    contentPath: '/posts/examples/zh-only/zh-cn',
    fallback: true,
  },
};

describe('顶部主导航', () => {
  it('将首页、文章和About页面映射到对应主导航分区', () => {
    assert.equal(resolvePrimaryNavigationSection('/zh-cn/'), 'home');
    assert.equal(resolvePrimaryNavigationSection('/en/posts/'), 'posts');
    assert.equal(resolvePrimaryNavigationSection('/zh-cn/posts/examples/hello-world/'), 'posts');
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
      '/zh-cn/posts/examples/hello-world/?from=feed#comments',
      articleDeliveryIndex,
    );
    const english = targets.find((target) => target.localeCode === 'en');

    assert.equal(english?.path, '/en/posts/examples/hello-world/?from=feed#comments');
  });

  it('缺少译文时仍生成按网站优先级排列的回退投递目标', () => {
    const targets = createLocaleNavigationTargets(
      '/zh-cn/posts/examples/zh-only/',
      articleDeliveryIndex,
    );
    const english = targets.find((target) => target.localeCode === 'en');

    assert.deepEqual(
      targets.map((target) => target.localeCode),
      ['zh-cn', 'en'],
    );
    assert.equal(english?.available, true);
    assert.equal(english?.path, '/en/posts/examples/zh-only/');
  });
});
