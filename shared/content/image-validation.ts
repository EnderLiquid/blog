import { parseMarkdown } from '@nuxtjs/mdc/runtime';
import normalizeArticleImages from './normalize-article-images.ts';

const imageValidationOptions = {
  rehype: {
    plugins: {
      'normalize-article-images': {
        instance: normalizeArticleImages,
      },
    },
  },
} as const;

/** 在构建清单前校验文章图片的结构、属性和排版组合。 */
export async function validateMarkdownImages(markdown: string, sourcePath: string): Promise<void> {
  await parseMarkdown(markdown, imageValidationOptions, {
    fileOptions: {
      path: sourcePath,
    },
  });
}
