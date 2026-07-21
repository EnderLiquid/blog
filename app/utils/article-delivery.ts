import { SITE_ARTICLE_DELIVERY_INDEX } from '../generated/site-article-delivery-index';
import type { LocaleCode } from '../../shared/i18n/locales.ts';
import type {
  ArticleDeliveryDescriptor,
  ArticleDeliveryIndexView,
} from '../../shared/site-projections/model.ts';

export const ARTICLE_DELIVERY_INDEX: ArticleDeliveryIndexView = SITE_ARTICLE_DELIVERY_INDEX;

/** 根据公开路径读取文章投递描述。 */
export function findArticleDeliveryByPath(path: string): ArticleDeliveryDescriptor | undefined {
  return ARTICLE_DELIVERY_INDEX[normalizeArticlePagePath(path)];
}

/** 根据文章身份和界面语言读取唯一公开投递页面。 */
export function findArticleDelivery(
  articleKeyPath: string,
  interfaceLocaleCode: LocaleCode,
): ArticleDeliveryDescriptor | undefined {
  return Object.values(ARTICLE_DELIVERY_INDEX).find(
    (descriptor) =>
      descriptor.articleKeyPath === articleKeyPath &&
      descriptor.interfaceLocaleCode === interfaceLocaleCode,
  );
}

function normalizeArticlePagePath(path: string): string {
  if (path.endsWith('/') || path.endsWith('.html')) {
    return path;
  }

  return `${path}/`;
}
