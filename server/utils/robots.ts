import type { RobotsView } from '../../shared/site-projections/model.ts';

export function renderRobotsTxt(view: RobotsView): string {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${view.sitemapUrl}`, ''].join('\n');
}
