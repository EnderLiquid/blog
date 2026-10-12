import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pluralize } from '../../shared/i18n/english.ts';

describe('pluralize', () => {
  it('仅在数量为1时使用单数', () => {
    assert.equal(pluralize(1, 'view'), 'view');
    assert.equal(pluralize(0, 'view'), 'views');
    assert.equal(pluralize(10, 'view'), 'views');
  });

  it('允许显式指定不规则复数', () => {
    assert.equal(pluralize(1, 'index', 'indices'), 'index');
    assert.equal(pluralize(2, 'index', 'indices'), 'indices');
  });
});
