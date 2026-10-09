import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createGoatCounterArticleCountUrl,
  createGoatCounterArticlePath,
  GOATCOUNTER_COUNT_ENDPOINT,
  GOATCOUNTER_ORIGIN,
} from '../../shared/analytics/goatcounter.ts';

describe('GoatCounter文章统计路径', () => {
  it('使用与域名和界面语言无关的articleKeyPath', () => {
    assert.equal(
      createGoatCounterArticlePath('guides/markdown-writing'),
      '/articles/guides/markdown-writing',
    );
  });

  it('规范化文章身份并编码公开计数地址', () => {
    assert.equal(
      createGoatCounterArticleCountUrl('/guides/markdown-writing/'),
      `${GOATCOUNTER_ORIGIN}/counter/%2Farticles%2Fguides%2Fmarkdown-writing.json`,
    );
  });

  it('固定自定义域名下的采集端点', () => {
    assert.equal(GOATCOUNTER_COUNT_ENDPOINT, `${GOATCOUNTER_ORIGIN}/count`);
  });

  it('拒绝空文章身份', () => {
    assert.throws(() => createGoatCounterArticlePath('///'), /articleKeyPath 不能为空/);
  });
});
