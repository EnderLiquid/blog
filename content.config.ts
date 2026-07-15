import { defineCollection, defineContentConfig } from '@nuxt/content';
import { postMetadataSchema } from './shared/content/post-schema.ts';

export default defineContentConfig({
  collections: {
    posts: defineCollection({
      type: 'page',
      source: 'posts/**/*.md',
      schema: postMetadataSchema,
    }),
  },
});
