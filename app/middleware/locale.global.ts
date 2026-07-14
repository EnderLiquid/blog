import { isLocaleKey } from '~~/shared/i18n/locales';

/**
 * 所有内容页面都必须显式包含语言前缀。
 * 根入口和 GitHub Pages 的错误文档是仅有的无前缀页面。
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/' || to.path === '/404.html' || to.path === '/200.html') {
    return;
  }

  const firstPathSegment = to.path.split('/').filter(Boolean)[0];

  if (!isLocaleKey(firstPathSegment)) {
    return abortNavigation(
      createError({
        statusCode: 404,
        message: '页面不存在',
      }),
    );
  }
});
