import type { LocaleCode } from '../i18n/locales.ts';

export function articleResourceId(articleKeyPath: string, localeCode: LocaleCode): string {
  return `article:${articleKeyPath}:${localeCode}`;
}

export function articleFallbackResourceId(articleKeyPath: string, localeCode: LocaleCode): string {
  return `article-fallback:${articleKeyPath}:${localeCode}`;
}
