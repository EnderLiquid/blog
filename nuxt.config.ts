import { readFile } from 'node:fs/promises';
import { validateSiteManifest } from './shared/site-manifest/build.ts';
import { createPrerenderRoutesView } from './shared/site-projections/prerender.ts';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content'],
  css: ['~/assets/css/main.css'],
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: [],
    },
  },
  hooks: {
    async 'prerender:routes'({ routes }) {
      // 清单是具体公开资源的唯一构建期来源，Nuxt不再自行拼接页面或文章路由。
      const manifestUrl = new URL('./.data/site-manifest.json', import.meta.url);
      const source = await readFile(manifestUrl, 'utf8');
      const manifest = validateSiteManifest(JSON.parse(source) as unknown);

      for (const route of createPrerenderRoutesView(manifest)) {
        routes.add(route);
      }
    },
  },
  typescript: {
    strict: true,
  },
});
