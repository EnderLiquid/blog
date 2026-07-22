import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { PROFILE_LINKS } from '../../shared/site-definitions/profile.ts';

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
