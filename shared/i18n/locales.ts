/**
 * 站点支持的语言定义。
 *
 * code 是站点唯一语言标识，同时也是合法的小写 BCP 47标签。URL、内容文件名、
 * HTML lang、Intl 和 Pagefind 都直接使用它，不为不同边界保存重复映射。
 */
export const LOCALE_DEFINITIONS = [
  {
    code: 'zh-cn',
    label: '中文',
  },
  {
    code: 'en',
    label: 'English',
  },
] as const;

export type LocaleDefinition = (typeof LOCALE_DEFINITIONS)[number];
export type LocaleCode = LocaleDefinition['code'];

export const DEFAULT_LOCALE_CODE: LocaleCode = 'zh-cn';
export const SUPPORTED_LOCALE_CODES = LOCALE_DEFINITIONS.map(
  (definition) => definition.code,
) as LocaleCode[];

/** 判断字符串是否已经是规范化后的站点语言代码。 */
export function isLocaleCode(value: string): value is LocaleCode {
  return SUPPORTED_LOCALE_CODES.some((candidate) => candidate === value);
}

/**
 * 严格解析站点内部边界使用的语言代码。
 *
 * 只忽略 BCP 47标签的大小写差异；空格、下划线、地区扩展和未注册语言都视为错误。
 */
export function parseLocaleCode(value: string): LocaleCode {
  const normalizedValue = value.toLowerCase();
  const localeCode = SUPPORTED_LOCALE_CODES.find((candidate) => candidate === normalizedValue);

  if (!localeCode) {
    throw new Error(`不支持的语言代码：“${value}”`);
  }

  return localeCode;
}

/**
 * 将浏览器等外部来源的宽泛语言标签匹配为站点语言。
 *
 * 完整匹配优先；基础语言只有一个候选时才兼容匹配。该函数不执行默认回退，
 * 以免调用方遍历多个偏好时被首个不支持的候选提前截断。
 */
export function matchCompatibleLocaleCode(value: string): LocaleCode | undefined {
  const normalizedValue = value.toLowerCase();
  const exactMatch = SUPPORTED_LOCALE_CODES.find((candidate) => candidate === normalizedValue);

  if (exactMatch) {
    return exactMatch;
  }

  const baseLanguage = normalizedValue.split('-')[0];

  if (!baseLanguage) {
    return undefined;
  }

  const baseLanguageMatches = SUPPORTED_LOCALE_CODES.filter(
    (candidate) => candidate.split('-')[0] === baseLanguage,
  );

  return baseLanguageMatches.length === 1 ? baseLanguageMatches[0] : undefined;
}
