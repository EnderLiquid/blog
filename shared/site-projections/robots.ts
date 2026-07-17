import type { SiteManifest } from '../site-manifest/model.ts';
import { absoluteManifestUrl, findMachineResource } from '../site-manifest/relations.ts';
import type { RobotsView } from './model.ts';

export function createRobotsView(manifest: SiteManifest): RobotsView {
  const sitemapResource = findMachineResource(manifest, 'sitemap');
  return {
    sitemapUrl: absoluteManifestUrl(manifest, sitemapResource.path),
  };
}
