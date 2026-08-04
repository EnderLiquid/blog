import type { VFile } from 'vfile';

/**
 * rehype-katex 会将公式错误记录为非致命 VFile 消息后回退输出。
 * 静态文章不能发布损坏的公式，因此将该消息提升为构建错误。
 */
export default function failOnKaTeXErrors() {
  return (_tree: unknown, file: VFile): void => {
    const error = file.messages.find((message) => message.source === 'rehype-katex');

    if (error) {
      file.fail(error);
    }
  };
}
