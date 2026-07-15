import { readFile } from 'node:fs/promises';
import { LOCALE_DEFINITIONS } from './shared/i18n/locales';
import { ROBOTS_PATH, rssPath, SITEMAP_PATH } from './shared/routing/localized-routes';

const localizedEntryRoutes = LOCALE_DEFINITIONS.flatMap((definition) => [
  `/${definition.code}/`,
  `/${definition.code}/posts/`,
]);
const machineRoutes = [
  SITEMAP_PATH,
  ROBOTS_PATH,
  ...LOCALE_DEFINITIONS.map((definition) => rssPath(definition.code)),
];

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content'],
  css: ['~/assets/css/main.css'],
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', ...localizedEntryRoutes, ...machineRoutes],
    },
  },
  hooks: {
    async 'prerender:routes'({ routes }) {
      // 文章详情不会全部出现在入口页面中，构建前校验生成的清单是完整静态路由来源。
      const manifestUrl = new URL('./.data/content-routes.json', import.meta.url);
      const articleRoutes = JSON.parse(await readFile(manifestUrl, 'utf8')) as string[];

      for (const route of articleRoutes) {
        routes.add(route);
      }
    },
  },
  typescript: {
    strict: true,
  },
});
