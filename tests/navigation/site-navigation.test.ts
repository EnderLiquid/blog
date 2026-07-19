import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PageSeoDescriptor } from '../../shared/site-projections/model.ts';
import {
  createLocaleNavigationTargets,
  resolvePrimaryNavigationSection,
} from '../../app/utils/site-navigation.ts';

const articleDescriptor: PageSeoDescriptor = {
  path: '/zh-cn/posts/examples/hello-world/',
  title: '环境已经就绪',
  description: '示例文章',
  indexability: 'index',
  canonicalUrl: 'https://blog.example/zh-cn/posts/examples/hello-world/',
  languageAlternates: [
    {
      localeCode: 'zh-cn',
      url: 'https://blog.example/zh-cn/posts/examples/hello-world/',
    },
    {
      localeCode: 'en',
      url: 'https://blog.example/en/posts/examples/hello-world/',
    },
    {
      localeCode: 'x-default',
      url: 'https://blog.example/zh-cn/posts/examples/hello-world/',
    },
  ],
  feeds: [],
};

describe('顶部主导航', () => {
  it('将首页和文章页面映射到对应主导航分区', () => {
    assert.equal(resolvePrimaryNavigationSection('/zh-cn/'), 'home');
    assert.equal(resolvePrimaryNavigationSection('/en/posts/'), 'posts');
    assert.equal(resolvePrimaryNavigationSection('/zh-cn/posts/examples/hello-world/'), 'posts');
  });
});

describe('顶部语言菜单', () => {
  it('普通页面切换语言时保留query与Hash', () => {
    const targets = createLocaleNavigationTargets('/zh-cn/posts/?q=nuxt&sort=oldest#result');
    const english = targets.find((target) => target.localeCode === 'en');

    assert.equal(english?.available, true);
    assert.equal(english?.path, '/en/posts/?q=nuxt&sort=oldest#result');
  });

  it('文章详情只使用投影中存在的译文并保留query与Hash', () => {
    const targets = createLocaleNavigationTargets(
      '/zh-cn/posts/examples/hello-world/?from=feed#comments',
      articleDescriptor,
    );
    const english = targets.find((target) => target.localeCode === 'en');

    assert.equal(english?.path, '/en/posts/examples/hello-world/?from=feed#comments');
  });

  it('缺少译文时禁用目标语言', () => {
    const descriptorWithoutEnglish: PageSeoDescriptor = {
      ...articleDescriptor,
      languageAlternates: articleDescriptor.languageAlternates.filter(
        (alternate) => alternate.localeCode !== 'en',
      ),
    };
    const targets = createLocaleNavigationTargets(
      '/zh-cn/posts/examples/hello-world/',
      descriptorWithoutEnglish,
    );
    const english = targets.find((target) => target.localeCode === 'en');

    assert.equal(english?.available, false);
    assert.equal(english?.path, undefined);
  });
});
