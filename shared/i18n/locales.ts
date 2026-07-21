/**
 * 站点支持的语言定义，按全局fallback优先级从高到低排列。
 *
 * code 是站点唯一语言标识，同时也是合法的小写BCP 47标签。URL、内容文件名、
 * HTML lang、Intl和Pagefind都直接使用它。调整数组顺序会改变语言协商、文章
 * fallback、无中立入口时的x-default，以及所有语言列表的展示顺序。
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
 * 只忽略BCP 47标签的大小写差异；空格、下划线、地区扩展和未注册语言都视为错误。
 */
export function parseLocaleCode(value: string): LocaleCode {
  const normalizedValue = value.toLowerCase();
  const localeCode = SUPPORTED_LOCALE_CODES.find((candidate) => candidate === normalizedValue);

  if (!localeCode) {
    throw new Error(`不支持的语言代码：“${value}”`);
  }

  return localeCode;
}

/** 将语言子集去重，并恢复为站点注册表规定的优先级顺序。 */
export function orderLocaleCodesByPriority(localeCodes: readonly LocaleCode[]): LocaleCode[] {
  const availableLocaleCodes = new Set(localeCodes);
  return SUPPORTED_LOCALE_CODES.filter((localeCode) => availableLocaleCodes.has(localeCode));
}

/**
 * 根据已经排好优先级的可用语言执行通用的两轮偏好解析。
 *
 * 第一轮按用户顺序尝试全部精确匹配；只有第一轮完全失败后，第二轮才按用户顺序
 * 尝试基础语言兼容匹配。一个模糊输入存在多个候选时，取orderedAvailable中的首项。
 * 两轮均失败时，返回优先级最高的可用语言。
 */
export function resolveLanguageTagPreference<T extends string>(
  preferredLanguageTags: readonly string[],
  orderedAvailableLanguageTags: readonly T[],
): T | undefined {
  const orderedAvailable = uniqueLanguageTags(orderedAvailableLanguageTags);

  for (const preferredLanguageTag of preferredLanguageTags) {
    const exactMatch = findExactLanguageTag(preferredLanguageTag, orderedAvailable);

    if (exactMatch) {
      return exactMatch;
    }
  }

  for (const preferredLanguageTag of preferredLanguageTags) {
    const compatibleMatch = findCompatibleLanguageTag(preferredLanguageTag, orderedAvailable);

    if (compatibleMatch) {
      return compatibleMatch;
    }
  }

  return orderedAvailable[0];
}

/**
 * 在当前真实可用的站点语言中解析最终偏好。
 *
 * availableLocaleCodes的传入顺序没有语义；函数会先恢复网站优先级。可用集合为空时
 * 返回undefined。该函数不用于URL、文件名和Manifest身份等严格解析边界。
 */
export function resolveLocalePreference(
  preferredLanguageTags: readonly string[],
  availableLocaleCodes: readonly LocaleCode[],
): LocaleCode | undefined {
  return resolveLanguageTagPreference(
    preferredLanguageTags,
    orderLocaleCodesByPriority(availableLocaleCodes),
  );
}

/**
 * 将一个外部语言标签兼容匹配到当前可用站点语言，但不执行最终fallback。
 * 多个兼容候选按网站优先级选择。
 */
export function matchCompatibleLocaleCode(
  value: string,
  availableLocaleCodes: readonly LocaleCode[] = SUPPORTED_LOCALE_CODES,
): LocaleCode | undefined {
  const orderedAvailable = orderLocaleCodesByPriority(availableLocaleCodes);
  return (
    findExactLanguageTag(value, orderedAvailable) ??
    findCompatibleLanguageTag(value, orderedAvailable)
  );
}

function uniqueLanguageTags<T extends string>(languageTags: readonly T[]): T[] {
  const seen = new Set<string>();
  const uniqueTags: T[] = [];

  for (const languageTag of languageTags) {
    const normalizedLanguageTag = languageTag.toLowerCase();

    if (!seen.has(normalizedLanguageTag)) {
      seen.add(normalizedLanguageTag);
      uniqueTags.push(languageTag);
    }
  }

  return uniqueTags;
}

function findExactLanguageTag<T extends string>(
  value: string,
  availableLanguageTags: readonly T[],
): T | undefined {
  const normalizedValue = value.toLowerCase();
  return availableLanguageTags.find((candidate) => candidate.toLowerCase() === normalizedValue);
}

function findCompatibleLanguageTag<T extends string>(
  value: string,
  availableLanguageTags: readonly T[],
): T | undefined {
  const baseLanguage = baseLanguageOf(value);

  if (!baseLanguage) {
    return undefined;
  }

  return availableLanguageTags.find((candidate) => baseLanguageOf(candidate) === baseLanguage);
}

function baseLanguageOf(value: string): string | undefined {
  const [baseLanguage] = value.toLowerCase().split('-');
  return baseLanguage || undefined;
}
