import { createError, defineEventHandler, getRouterParam, setResponseHeader } from 'h3';
import { parseLocaleCode } from '../../../shared/i18n/locales';
import { queryPublishedPostVariants } from '../../utils/published-posts';
import { renderRssFeed } from '../../utils/rss';

export default defineEventHandler(async (event) => {
  const localeValue = getRouterParam(event, 'locale') ?? '';
  let localeCode;

  try {
    localeCode = parseLocaleCode(localeValue);
  } catch {
    throw createError({ statusCode: 404, message: 'RSS订阅源不存在' });
  }

  const posts = await queryPublishedPostVariants(event);
  const localizedPosts = posts.filter((post) => post.localeCode === localeCode);

  setResponseHeader(event, 'content-type', 'application/rss+xml; charset=utf-8');
  return renderRssFeed(localeCode, localizedPosts);
});
