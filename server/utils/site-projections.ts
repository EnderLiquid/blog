import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  parseRobotsView,
  parseRssProjectionView,
  parseSitemapProjectionView,
  type RobotsView,
  type RssProjectionView,
  type SitemapProjectionView,
} from '../../shared/site-projections/model.ts';

const projectionsDirectory = path.join(process.cwd(), '.data', 'site-projections');

/** 开发模式每次读取，以便构建监听刷新后立即使用最新投影。 */
export async function readRssProjection(): Promise<RssProjectionView> {
  return parseRssProjectionView(await readProjectionFile('rss.json'));
}

export async function readSitemapProjection(): Promise<SitemapProjectionView> {
  return parseSitemapProjectionView(await readProjectionFile('sitemap.json'));
}

export async function readRobotsProjection(): Promise<RobotsView> {
  return parseRobotsView(await readProjectionFile('robots.json'));
}

async function readProjectionFile(fileName: string): Promise<unknown> {
  const source = await readFile(path.join(projectionsDirectory, fileName), 'utf8');
  return JSON.parse(source) as unknown;
}
