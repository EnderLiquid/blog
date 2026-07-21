import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  matchCompatibleLocaleCode,
  orderLocaleCodesByPriority,
  parseLocaleCode,
  resolveLanguageTagPreference,
  resolveLocalePreference,
  SUPPORTED_LOCALE_CODES,
} from '../../shared/i18n/locales.ts';

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

describe('网站语言优先级', () => {
  it('按注册表顺序排列并去重语言子集', () => {
    assert.deepEqual(orderLocaleCodesByPriority(['en', 'zh-cn', 'en']), ['zh-cn', 'en']);
    assert.deepEqual(orderLocaleCodesByPriority(['en']), ['en']);
  });

  it('完全无法匹配时选择最高优先级可用语言', () => {
    assert.equal(resolveLocalePreference(['fr-FR'], ['en', 'zh-cn']), 'zh-cn');
    assert.equal(resolveLocalePreference([], ['en']), 'en');
    assert.equal(resolveLocalePreference(['en'], []), undefined);
  });
});

describe('两轮语言偏好解析', () => {
  const regionalLocales = ['zh-cn', 'en-us', 'en-gb', 'de-de'] as const;

  it('先完成所有用户偏好的精确匹配，再开始模糊匹配', () => {
    assert.equal(resolveLanguageTagPreference(['en-au', 'zh-CN'], regionalLocales), 'zh-cn');
  });

  it('精确阶段失败后，按用户顺序执行模糊匹配', () => {
    assert.equal(resolveLanguageTagPreference(['en-au', 'de-at'], regionalLocales), 'en-us');
  });

  it('一个模糊输入存在多个候选时选择网站优先级最高者', () => {
    assert.equal(resolveLanguageTagPreference(['en-ca'], regionalLocales), 'en-us');
  });

  it('忽略大小写、跳过无匹配候选，并在空偏好时fallback', () => {
    assert.equal(resolveLanguageTagPreference(['fr-fr', 'EN-GB'], regionalLocales), 'en-gb');
    assert.equal(resolveLanguageTagPreference([], regionalLocales), 'zh-cn');
    assert.equal(resolveLanguageTagPreference(['en'], []), undefined);
  });
});

describe('matchCompatibleLocaleCode', () => {
  it('执行完整和基础语言匹配，但不执行最终fallback', () => {
    assert.equal(matchCompatibleLocaleCode('zh-CN'), 'zh-cn');
    assert.equal(matchCompatibleLocaleCode('EN'), 'en');
    assert.equal(matchCompatibleLocaleCode('en-US'), 'en');
    assert.equal(matchCompatibleLocaleCode('fr-FR'), undefined);
    assert.equal(matchCompatibleLocaleCode('', SUPPORTED_LOCALE_CODES), undefined);
  });
});
