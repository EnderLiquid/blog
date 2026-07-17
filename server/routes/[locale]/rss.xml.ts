import { createError, defineEventHandler, getRouterParam, setResponseHeader } from 'h3';
import { parseLocaleCode } from '../../../shared/i18n/locales';
import { readRssProjection } from '../../utils/site-projections';
import { renderRssFeed } from '../../utils/rss';

export default defineEventHandler(async (event) => {
  const localeValue = getRouterParam(event, 'locale') ?? '';
  let localeCode;

  try {
    localeCode = parseLocaleCode(localeValue);
  } catch {
    throw createError({ statusCode: 404, message: 'RSS订阅源不存在' });
  }

  const projection = await readRssProjection();
  const rssView = projection.find((channel) => channel.localeCode === localeCode);

  if (!rssView) {
    throw createError({ statusCode: 404, message: 'RSS订阅源不存在' });
  }

  setResponseHeader(event, 'content-type', 'application/rss+xml; charset=utf-8');
  return renderRssFeed(rssView);
});
