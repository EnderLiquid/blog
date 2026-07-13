import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    posts: defineCollection({
      type: 'page',
      source: 'posts/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        publishedAt: z.date(),
        updatedAt: z.date().optional(),
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
        image: z
          .object({
            src: z.string(),
            alt: z.string(),
          })
          .optional(),
      }),
    }),
  },
})
