import { defineEventHandler, setResponseHeader } from 'h3';
import { createSitemapView } from '../../shared/site-manifest/views';
import { readSiteManifest } from '../utils/site-manifest';
import { renderSitemap } from '../utils/sitemap';

export default defineEventHandler(async (event) => {
  const manifest = await readSiteManifest();
  const sitemapView = createSitemapView(manifest);

  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8');
  return renderSitemap(sitemapView);
});
