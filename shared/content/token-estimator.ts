import { estimateTokenCount, type TokenEstimationOptions } from 'tokenx';

/** 使用tokenx估算文本token数；空文本统一返回0。 */
export function estimateTokens(text: string, options?: TokenEstimationOptions): number {
  if (!text) {
    return 0;
  }

  return options ? estimateTokenCount(text, options) : estimateTokenCount(text);
}
