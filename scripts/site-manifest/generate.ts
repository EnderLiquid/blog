import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { buildSiteManifest, validateSiteManifest } from '../../shared/site-manifest/build.ts';
import { createSiteBuildContext } from '../../shared/site-manifest/context.ts';
import {
  parseArticleDeliveryIndexView,
  parsePageSeoIndexView,
  parseRobotsView,
  parseRssProjectionView,
  parseSitemapProjectionView,
} from '../../shared/site-projections/model.ts';
import { createArticleDeliveryIndexView } from '../../shared/site-projections/article-delivery.ts';
import { createPageSeoIndexView } from '../../shared/site-projections/seo.ts';
import { createRobotsView } from '../../shared/site-projections/robots.ts';
import { createRssProjectionView } from '../../shared/site-projections/rss.ts';
import { createShellNavigationProjection } from '../../shared/site-projections/shell.ts';
import { createSitemapView } from '../../shared/site-projections/sitemap.ts';
import { readPostSources } from './content-source.ts';

export const SITE_MANIFEST_PATH = path.join(process.cwd(), '.data', 'site-manifest.json');
export const SITE_PROJECTIONS_DIRECTORY = path.join(process.cwd(), '.data', 'site-projections');
export const RSS_PROJECTION_PATH = path.join(SITE_PROJECTIONS_DIRECTORY, 'rss.json');
export const SITEMAP_PROJECTION_PATH = path.join(SITE_PROJECTIONS_DIRECTORY, 'sitemap.json');
export const ROBOTS_PROJECTION_PATH = path.join(SITE_PROJECTIONS_DIRECTORY, 'robots.json');
export const SITE_ARTICLE_DELIVERY_INDEX_PATH = path.join(
  process.cwd(),
  'app',
  'generated',
  'site-article-delivery-index.ts',
);
export const SITE_SEO_INDEX_PATH = path.join(
  process.cwd(),
  'app',
  'generated',
  'site-seo-index.ts',
);
export const SITE_SHELL_INDEX_PATH = path.join(
  process.cwd(),
  'app',
  'generated',
  'site-shell-index.ts',
);

let temporaryFileSequence = 0;

export interface GenerateSiteManifestResult {
  resourceCount: number;
  articleCount: number;
  fallbackArticleCount: number;
  manifestPath: string;
  articleDeliveryIndexPath: string;
  seoIndexPath: string;
  shellIndexPath: string;
  projectionsDirectory: string;
}

/** 扫描来源、构建纯拓扑Manifest，并生成职责独立的消费者投影。 */
export async function generateSiteManifest(): Promise<GenerateSiteManifestResult> {
  const postsDirectory = path.join(process.cwd(), 'content', 'posts');
  const posts = await readPostSources(postsDirectory);
  const manifest = validateSiteManifest(buildSiteManifest({ posts }));
  const context = createSiteBuildContext(manifest, posts);
  const articleDeliveryIndex = parseArticleDeliveryIndexView(
    createArticleDeliveryIndexView(context),
  );
  const seoIndex = parsePageSeoIndexView(createPageSeoIndexView(context));
  const rssProjection = parseRssProjectionView(createRssProjectionView(context));
  const sitemapProjection = parseSitemapProjectionView(createSitemapView(context));
  const robotsProjection = parseRobotsView(createRobotsView(manifest));
  const shellProjection = createShellNavigationProjection(context);
  const manifestSource = toJsonSource(manifest);
  const rssSource = toJsonSource(rssProjection);
  const sitemapSource = toJsonSource(sitemapProjection);
  const robotsSource = toJsonSource(robotsProjection);
  const articleDeliveryIndexSource = [
    "import type { ArticleDeliveryIndexView } from '../../shared/site-projections/model.ts';",
    '',
    `export const SITE_ARTICLE_DELIVERY_INDEX: ArticleDeliveryIndexView = ${JSON.stringify(articleDeliveryIndex, null, 2)};`,
    '',
  ].join('\n');
  const seoIndexSource = [
    "import type { PageSeoIndexView } from '../../shared/site-projections/model.ts';",
    '',
    `export const SITE_SEO_INDEX: PageSeoIndexView = ${JSON.stringify(seoIndex, null, 2)};`,
    '',
  ].join('\n');
  const shellIndexSource = [
    "import type { ShellNavigationProjection } from '../../shared/site-projections/shell.ts';",
    '',
    `export const SITE_SHELL_INDEX: ShellNavigationProjection = ${JSON.stringify(shellProjection, null, 2)};`,
    '',
  ].join('\n');

  await mkdir(path.dirname(SITE_MANIFEST_PATH), { recursive: true });
  await mkdir(SITE_PROJECTIONS_DIRECTORY, { recursive: true });
  await mkdir(path.dirname(SITE_ARTICLE_DELIVERY_INDEX_PATH), { recursive: true });

  await atomicWriteFile(SITE_MANIFEST_PATH, manifestSource);
  await atomicWriteFile(RSS_PROJECTION_PATH, rssSource);
  await atomicWriteFile(SITEMAP_PROJECTION_PATH, sitemapSource);
  await atomicWriteFile(ROBOTS_PROJECTION_PATH, robotsSource);
  await atomicWriteFile(SITE_SHELL_INDEX_PATH, shellIndexSource);
  await atomicWriteFile(SITE_ARTICLE_DELIVERY_INDEX_PATH, articleDeliveryIndexSource);
  // 浏览器SEO投影最后写入；它触发Vite HMR时，其余同版本构建数据已经完整落盘。
  await atomicWriteFile(SITE_SEO_INDEX_PATH, seoIndexSource);

  return {
    resourceCount: manifest.resources.length,
    articleCount: manifest.resources.filter((resource) => resource.kind === 'article-page').length,
    fallbackArticleCount: manifest.resources.filter(
      (resource) => resource.kind === 'article-fallback-page',
    ).length,
    manifestPath: SITE_MANIFEST_PATH,
    articleDeliveryIndexPath: SITE_ARTICLE_DELIVERY_INDEX_PATH,
    seoIndexPath: SITE_SEO_INDEX_PATH,
    shellIndexPath: SITE_SHELL_INDEX_PATH,
    projectionsDirectory: SITE_PROJECTIONS_DIRECTORY,
  };
}

function toJsonSource(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function atomicWriteFile(targetPath: string, content: string): Promise<void> {
  temporaryFileSequence += 1;
  const temporaryPath = `${targetPath}.${process.pid}.${temporaryFileSequence}.tmp`;
  await writeFile(temporaryPath, content, 'utf8');
  await rename(temporaryPath, targetPath);
}
