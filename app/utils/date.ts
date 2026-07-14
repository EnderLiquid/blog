import type { LanguageTag } from '~~/shared/i18n/locales';

/** 使用固定 UTC 时区格式化文章日期，保证构建机器不会改变显示日期。 */
export function formatPostDate(value: Date | string, languageTag: LanguageTag): string {
  return new Intl.DateTimeFormat(languageTag, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(value));
}

/** 生成 HTML time 元素使用的 YYYY-MM-DD 日期。 */
export function toDateTime(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}
