import type { RobotsView } from '../../shared/site-manifest/views.ts';

export function renderRobotsTxt(view: RobotsView): string {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${view.sitemapUrl}`, ''].join('\n');
}
