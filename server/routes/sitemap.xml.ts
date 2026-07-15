import { defineEventHandler, setResponseHeader } from 'h3';
import { queryPublishedPostVariants } from '../utils/published-posts';
import { renderSitemap } from '../utils/sitemap';

export default defineEventHandler(async (event) => {
  const posts = await queryPublishedPostVariants(event);

  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8');
  return renderSitemap(posts);
});
