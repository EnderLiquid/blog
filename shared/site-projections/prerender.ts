import type { SiteManifest } from '../site-manifest/model.ts';

/** 预渲染只消费资源拓扑，不读取任何页面或文章metadata。 */
export function createPrerenderRoutesView(manifest: SiteManifest): string[] {
  return manifest.resources.map((resource) => resource.path);
}
