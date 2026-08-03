import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { PROFILE_LINKS } from '../../shared/site-definitions/profile.ts';
import { SITE_MESSAGES } from '../../shared/i18n/messages.ts';

describe('About外部坐标', () => {
  it('固定公开主页地址和显示身份', () => {
    assert.deepEqual(PROFILE_LINKS.github, {
      url: 'https://github.com/EnderLiquid',
      identity: '@EnderLiquid',
    });
    assert.deepEqual(PROFILE_LINKS.bilibili, {
      url: 'https://space.bilibili.com/523851915',
      identity: 'UID 523851915',
    });
  });

  it('本地SVG使用currentColor并隐藏装饰语义', async () => {
    const iconFiles = ['GitHubIcon.vue', 'BilibiliIcon.vue'];

    for (const iconFile of iconFiles) {
      const source = await readFile(
        new URL(`../../app/components/icons/${iconFile}`, import.meta.url),
        'utf8',
      );

      assert.match(source, /fill="currentColor"/u);
      assert.match(source, /aria-hidden="true"/u);
      assert.match(source, /focusable="false"/u);
    }
  });
});

describe('About昼夜叙事', () => {
  it('为双语提供独立的亮色与暗色正文', () => {
    for (const localeCode of ['zh-cn', 'en'] as const) {
      const prose = SITE_MESSAGES[localeCode].about.prose;

      assert.equal(prose.light.length, 2);
      assert.equal(prose.dark.length, 2);
      assert.notEqual(prose.light[0], prose.dark[0]);
    }

    assert.match(SITE_MESSAGES['zh-cn'].about.prose.dark[1], /^不过，那又如何呢？/u);
    assert.match(SITE_MESSAGES.en.about.prose.dark[1], /sailors of ancient Greece/u);
    assert.match(SITE_MESSAGES.en.about.prose.dark[1], /^Yet what does that matter\?/u);
  });

  it('使用媒体查询在布局中只显示一个主题分支', async () => {
    const source = await readFile(
      new URL('../../app/pages/[locale]/about/index.vue', import.meta.url),
      'utf8',
    );

    assert.match(source, /about-prose__light/u);
    assert.match(source, /about-prose__dark/u);
    assert.match(source, /@media \(prefers-color-scheme: dark\)/u);
    assert.match(source, /\.about-prose__dark\s*\{\s*display: none;/u);
  });

  it('用统一节奏控制上下分隔线与内容的间距', async () => {
    const source = await readFile(
      new URL('../../app/pages/[locale]/about/index.vue', import.meta.url),
      'utf8',
    );

    assert.match(source, /--about-section-gap: clamp\(3\.75rem, 8cqi, 5rem\)/u);
    assert.match(source, /padding-bottom: var\(--about-section-gap\)/u);
    assert.match(source, /row-gap: var\(--about-section-gap\)/u);
    assert.match(source, /margin-top: calc\(0px - var\(--content-row-offset\)\)/u);
    assert.doesNotMatch(source, /min-height:/u);
    assert.doesNotMatch(source, /transform: translateY\(/u);
  });
});
