import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchCompatibleLocaleCode, parseLocaleCode } from '../../shared/i18n/locales.ts';

describe('parseLocaleCode', () => {
  it('接受已注册语言代码及其大小写变体', () => {
    assert.equal(parseLocaleCode('zh-cn'), 'zh-cn');
    assert.equal(parseLocaleCode('zh-CN'), 'zh-cn');
    assert.equal(parseLocaleCode('EN'), 'en');
  });

  it('拒绝基础语言、额外空格、下划线和未注册语言', () => {
    assert.throws(() => parseLocaleCode('en-US'), /en-US/);
    assert.throws(() => parseLocaleCode('fr'), /fr/);
    assert.throws(() => parseLocaleCode(' zh-cn '), / zh-cn /);
    assert.throws(() => parseLocaleCode('zh_CN'), /zh_CN/);
  });
});

describe('matchCompatibleLocaleCode', () => {
  it('优先执行不区分大小写的完整匹配', () => {
    assert.equal(matchCompatibleLocaleCode('zh-CN'), 'zh-cn');
    assert.equal(matchCompatibleLocaleCode('EN'), 'en');
  });

  it('兼容匹配只有一个站点候选的基础语言', () => {
    assert.equal(matchCompatibleLocaleCode('en-US'), 'en');
    assert.equal(matchCompatibleLocaleCode('en-GB'), 'en');
    assert.equal(matchCompatibleLocaleCode('zh-TW'), 'zh-cn');
  });

  it('无法匹配时返回 undefined，不执行默认回退', () => {
    assert.equal(matchCompatibleLocaleCode('fr-FR'), undefined);
    assert.equal(matchCompatibleLocaleCode(''), undefined);
  });
});
