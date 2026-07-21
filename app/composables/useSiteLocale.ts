import { SITE_MESSAGES } from '~~/shared/i18n/messages';
import { parseLocalizedPath, switchLocalePath } from '~~/shared/routing/localized-routes';
import {
  resolveLocalePreference,
  SUPPORTED_LOCALE_CODES,
  type LocaleCode,
} from '~~/shared/i18n/locales';

/**
 * 提供当前页面的全局语言上下文。
 *
 * URL是语言的唯一事实来源，这里只从路由派生状态，不创建可独立修改的语言 ref。
 * 切换语言时必须导航到 switchPath() 返回的新 URL。
 */
export function useSiteLocale() {
  const route = useRoute();
  const localeCode = computed<LocaleCode>(() => {
    const routeLocaleCode = parseLocalizedPath(route.path)?.localeCode;
    const fallbackLocaleCode = resolveLocalePreference([], SUPPORTED_LOCALE_CODES);

    if (!routeLocaleCode && !fallbackLocaleCode) {
      throw new Error('站点语言注册表不能为空');
    }

    return routeLocaleCode ?? fallbackLocaleCode!;
  });
  const messages = computed(() => SITE_MESSAGES[localeCode.value]);

  function switchPath(targetLocaleCode: LocaleCode): string {
    return switchLocalePath(route.fullPath, targetLocaleCode);
  }

  return {
    localeCode,
    messages,
    switchPath,
  };
}
