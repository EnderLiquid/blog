import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { VFile } from 'vfile';
import { MARKDOWN_MATH_KATEX_OPTIONS } from './markdown.ts';
import failOnKaTeXErrors from './strict-katex-errors.ts';

const mathProcessor = unified()
  .use(remarkParse)
  .use(remarkMath, { singleDollarTextMath: true })
  .use(remarkRehype)
  .use(rehypeKatex, MARKDOWN_MATH_KATEX_OPTIONS)
  .use(failOnKaTeXErrors);

/** 在构建清单前验证每篇文章的公式，避免Nuxt Content仅跳过损坏文件。 */
export async function validateMarkdownMath(markdown: string, sourcePath: string): Promise<void> {
  const file = new VFile({ path: sourcePath, value: markdown });
  const tree = mathProcessor.parse(file);

  await mathProcessor.run(tree, file);
}
