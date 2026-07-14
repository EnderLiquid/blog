/**
 * 站点支持的语言定义。
 *
 * localeKey 用于公开 URL，languageTag 用于 HTML、Intl 和文章 Frontmatter。
 * 两者含义不同，因此所有转换都必须经过此注册表。
 */
export const LOCALE_DEFINITIONS = [
  {
    localeKey: 'zh-cn',
    languageTag: 'zh-CN',
    pagefindLanguage: 'zh-cn',
    label: '中文',
  },
  {
    localeKey: 'en',
    languageTag: 'en',
    pagefindLanguage: 'en',
    label: 'English',
  },
] as const;

export type LocaleDefinition = (typeof LOCALE_DEFINITIONS)[number];
export type LocaleKey = LocaleDefinition['localeKey'];
export type LanguageTag = LocaleDefinition['languageTag'];
export type PagefindLanguage = LocaleDefinition['pagefindLanguage'];

export const DEFAULT_LOCALE_KEY: LocaleKey = 'zh-cn';
export const SUPPORTED_LOCALE_KEYS = LOCALE_DEFINITIONS.map(
  (definition) => definition.localeKey,
) as LocaleKey[];

/** 判断外部字符串是否为受支持的 URL 语言标识。 */
export function isLocaleKey(value: unknown): value is LocaleKey {
  return LOCALE_DEFINITIONS.some((definition) => definition.localeKey === value);
}

/** 根据 URL 语言标识读取完整配置；非法值会立即失败，避免静默使用错误语言。 */
export function getLocaleDefinition(localeKey: LocaleKey): LocaleDefinition {
  const definition = LOCALE_DEFINITIONS.find((candidate) => candidate.localeKey === localeKey);

  if (!definition) {
    throw new Error(`不支持的语言标识：${localeKey}`);
  }

  return definition;
}

/** 将 Frontmatter 或 HTML 使用的标准语言标签转换为 URL 语言标识。 */
export function getLocaleByLanguageTag(languageTag: LanguageTag): LocaleDefinition {
  const definition = LOCALE_DEFINITIONS.find((candidate) => candidate.languageTag === languageTag);

  if (!definition) {
    throw new Error(`不支持的语言标签：${languageTag}`);
  }

  return definition;
}
