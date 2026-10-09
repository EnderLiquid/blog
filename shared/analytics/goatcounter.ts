import { normalizeArticleKeyPath } from '../routing/localized-routes.ts';

/** GoatCounter 自定义域名；公开配置，不包含管理凭据。 */
export const GOATCOUNTER_ORIGIN = 'https://stats.blog.enderliquid.com';
export const GOATCOUNTER_COUNT_ENDPOINT = `${GOATCOUNTER_ORIGIN}/count`;

/** 为文章统计保留独立命名空间，避免与其他公开路径混淆。 */
const GOATCOUNTER_ARTICLE_PATH_PREFIX = '/articles/';

/** 将稳定文章身份转换为与域名、界面语言无关的GoatCounter路径。 */
export function createGoatCounterArticlePath(articleKeyPath: string): string {
  return `${GOATCOUNTER_ARTICLE_PATH_PREFIX}${normalizeArticleKeyPath(articleKeyPath)}`;
}

/** 创建公开Visitor Counter JSON地址。 */
export function createGoatCounterArticleCountUrl(articleKeyPath: string): string {
  const path = createGoatCounterArticlePath(articleKeyPath);
  return `${GOATCOUNTER_ORIGIN}/counter/${encodeURIComponent(path)}.json`;
}
