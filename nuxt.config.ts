import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  MARKDOWN_HEADING_ANCHOR_LINKS,
  MARKDOWN_HIGHLIGHT_LANGUAGE_ALIASES,
  MARKDOWN_HIGHLIGHT_LANGUAGES,
  MARKDOWN_HIGHLIGHT_THEME,
  MARKDOWN_MATH_REMARK_PLUGINS,
  MARKDOWN_REHYPE_PLUGINS,
} from './shared/content/markdown.ts';
import { validateSiteManifest } from './shared/site-manifest/build.ts';
import { createPrerenderRoutesView } from './shared/site-projections/prerender.ts';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content'],
  css: ['~/assets/css/main.css'],
  content: {
    renderer: {
      anchorLinks: MARKDOWN_HEADING_ANCHOR_LINKS,
    },
    build: {
      markdown: {
        remarkPlugins: MARKDOWN_MATH_REMARK_PLUGINS,
        rehypePlugins: MARKDOWN_REHYPE_PLUGINS,
        highlight: {
          // 代码面板固定为深色，因此构建期只生成与其匹配的Token颜色。
          theme: MARKDOWN_HIGHLIGHT_THEME,
          langs: [...MARKDOWN_HIGHLIGHT_LANGUAGES, ...MARKDOWN_HIGHLIGHT_LANGUAGE_ALIASES],
        },
      },
    },
  },
  nitro: {
    publicAssets: [
      {
        baseURL: '/_katex',
        dir: resolve('node_modules/katex/dist'),
      },
    ],
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
