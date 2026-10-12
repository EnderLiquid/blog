import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createGoatCounterArticleCountUrl,
  createGoatCounterArticlePath,
  GOATCOUNTER_COUNT_ENDPOINT,
  GOATCOUNTER_ORIGIN,
  parseGoatCounterCount,
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

describe('解析GoatCounter公开计数', () => {
  it('剥离计数中的分组符并转换为数字', () => {
    assert.equal(parseGoatCounterCount('2'), 2);
    assert.equal(parseGoatCounterCount('1,234'), 1234);
    assert.equal(parseGoatCounterCount('77\u202f831'), 77831);
  });

  it('没有数字时返回undefined', () => {
    assert.equal(parseGoatCounterCount(''), undefined);
    assert.equal(parseGoatCounterCount('not a count'), undefined);
  });
});
