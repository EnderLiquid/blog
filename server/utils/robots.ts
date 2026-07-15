import { SITEMAP_PATH } from '../../shared/routing/localized-routes.ts';
import { absoluteSiteUrl } from '../../shared/site/config.ts';

export function renderRobotsTxt(): string {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${absoluteSiteUrl(SITEMAP_PATH)}`, ''].join(
    '\n',
  );
}
