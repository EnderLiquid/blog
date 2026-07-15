import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { buildSiteManifest, validateSiteManifest } from '../../shared/site-manifest/build.ts';
import { createPageSeoIndexView } from '../../shared/site-manifest/views.ts';
import { readPostSources } from './content-source.ts';

export const SITE_MANIFEST_PATH = path.join(process.cwd(), '.data', 'site-manifest.json');
export const SITE_SEO_INDEX_PATH = path.join(
  process.cwd(),
  'app',
  'generated',
  'site-seo-index.ts',
);

let temporaryFileSequence = 0;

export interface GenerateSiteManifestResult {
  resourceCount: number;
  articleCount: number;
  manifestPath: string;
  seoIndexPath: string;
}

/** 扫描来源、构建清单，并以稳定格式写入构建产物。 */
export async function generateSiteManifest(): Promise<GenerateSiteManifestResult> {
  const postsDirectory = path.join(process.cwd(), 'content', 'posts');
  const posts = await readPostSources(postsDirectory);
  const manifest = validateSiteManifest(buildSiteManifest({ posts }));
  const seoIndex = createPageSeoIndexView(manifest);
  const manifestSource = `${JSON.stringify(manifest, null, 2)}\n`;
  const seoIndexSource = [
    "import type { PageSeoIndexView } from '../../shared/site-manifest/views.ts';",
    '',
    `export const SITE_SEO_INDEX: PageSeoIndexView = ${JSON.stringify(seoIndex, null, 2)};`,
    '',
  ].join('\n');

  await mkdir(path.dirname(SITE_MANIFEST_PATH), { recursive: true });
  await mkdir(path.dirname(SITE_SEO_INDEX_PATH), { recursive: true });
  await atomicWriteFile(SITE_MANIFEST_PATH, manifestSource);
  // SEO投影最后写入；它触发Vite HMR时，服务端完整清单已经是同一版本。
  await atomicWriteFile(SITE_SEO_INDEX_PATH, seoIndexSource);

  return {
    resourceCount: manifest.resources.length,
    articleCount: manifest.resources.filter((resource) => resource.kind === 'article-page').length,
    manifestPath: SITE_MANIFEST_PATH,
    seoIndexPath: SITE_SEO_INDEX_PATH,
  };
}

async function atomicWriteFile(targetPath: string, content: string): Promise<void> {
  temporaryFileSequence += 1;
  const temporaryPath = `${targetPath}.${process.pid}.${temporaryFileSequence}.tmp`;
  await writeFile(temporaryPath, content, 'utf8');
  await rename(temporaryPath, targetPath);
}
