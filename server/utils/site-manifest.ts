import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateSiteManifest } from '../../shared/site-manifest/build.ts';
import type { SiteManifest } from '../../shared/site-manifest/model.ts';

const manifestPath = path.join(process.cwd(), '.data', 'site-manifest.json');

/** 服务端按需读取完整清单；开发模式每次读取，以便内容监听刷新后立即生效。 */
export async function readSiteManifest(): Promise<SiteManifest> {
  const source = await readFile(manifestPath, 'utf8');
  return validateSiteManifest(JSON.parse(source) as unknown);
}
