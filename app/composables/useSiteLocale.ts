import { SITE_MESSAGES } from '~/i18n/messages';
import { parseLocalizedPath, switchLocalePath } from '~/utils/localized-routes';
import { DEFAULT_LOCALE_KEY, getLocaleDefinition, type LocaleKey } from '~~/shared/i18n/locales';

/**
 * 提供当前页面的全局语言上下文。
 *
 * URL 是语言的唯一事实来源，这里只从路由派生状态，不创建可独立修改的语言 ref。
 * 切换语言时必须导航到 switchPath() 返回的新 URL。
 */
export function useSiteLocale() {
  const route = useRoute();
  const localeKey = computed<LocaleKey>(
    () => parseLocalizedPath(route.path)?.localeKey ?? DEFAULT_LOCALE_KEY,
  );
  const localeDefinition = computed(() => getLocaleDefinition(localeKey.value));
  const messages = computed(() => SITE_MESSAGES[localeKey.value]);

  function switchPath(targetLocaleKey: LocaleKey): string {
    return switchLocalePath(route.fullPath, targetLocaleKey);
  }

  return {
    localeKey,
    localeDefinition,
    messages,
    switchPath,
  };
}
