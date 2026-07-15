import { z } from 'zod';

export const ARTICLE_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TAG_PATTERN = ARTICLE_SEGMENT_PATTERN;

const tagSchema = z.string().regex(TAG_PATTERN, '标签必须使用小写 ASCII kebab-case');

/** Nuxt Content与构建清单共同使用的文章metadata契约。 */
export const postMetadataSchema = z
  .object({
    title: z.string().min(1, 'title不能为空'),
    description: z.string().min(1, 'description不能为空'),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z
      .array(tagSchema)
      .default([])
      .superRefine((tags, context) => {
        if (new Set(tags).size !== tags.length) {
          context.addIssue({
            code: 'custom',
            message: 'tags不能包含重复值',
          });
        }
      }),
    draft: z.boolean().default(false),
    image: z
      .object({
        src: z.string().min(1, 'image.src不能为空'),
        alt: z.string().min(1, 'image.alt不能为空'),
      })
      .optional(),
  })
  .strict();

export type PostMetadata = z.output<typeof postMetadataSchema>;
