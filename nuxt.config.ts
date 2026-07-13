import { readFile } from 'node:fs/promises'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content'],
  css: ['~/assets/css/main.css'],
  nitro: {
    prerender: {
      crawlLinks: true,
    },
  },
  hooks: {
    async 'prerender:routes'({ routes }) {
      const manifestUrl = new URL('./.data/content-routes.json', import.meta.url)
      const articleRoutes = JSON.parse(await readFile(manifestUrl, 'utf8')) as string[]

      for (const route of articleRoutes) {
        routes.add(route)
      }
    },
  },
  typescript: {
    strict: true,
  },
})
