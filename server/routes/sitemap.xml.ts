import { defineEventHandler, setResponseHeader } from 'h3';
import { readSitemapProjection } from '../utils/site-projections';
import { renderSitemap } from '../utils/sitemap';

export default defineEventHandler(async (event) => {
  const sitemapView = await readSitemapProjection();

  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8');
  return renderSitemap(sitemapView);
});
