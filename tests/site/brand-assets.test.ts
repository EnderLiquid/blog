import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const readProjectFile = (relativePath: string): Promise<string> =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
const readProjectBinary = (relativePath: string): Promise<Buffer> =>
  readFile(new URL(`../../${relativePath}`, import.meta.url));

interface WebManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose: string;
  }>;
}

function readPngDimensions(source: Buffer): { width: number; height: number } {
  assert.deepEqual(source.subarray(0, PNG_SIGNATURE.length), PNG_SIGNATURE);
  assert.equal(source.toString('ascii', 12, 16), 'IHDR');

  return {
    width: source.readUInt32BE(16),
    height: source.readUInt32BE(20),
  };
}

function readIcoSizes(source: Buffer): Array<{ width: number; height: number }> {
  assert.equal(source.readUInt16LE(0), 0);
  assert.equal(source.readUInt16LE(2), 1);

  const count = source.readUInt16LE(4);
  const sizes = [];

  for (let index = 0; index < count; ++index) {
    const offset = 6 + index * 16;
    const width = source[offset] || 256;
    const height = source[offset + 1] || 256;
    sizes.push({ width, height });
  }

  return sizes;
}

describe('站点图标与安装入口', () => {
  test('全局head同时声明浏览器、Apple和Web App Manifest入口', async () => {
    const app = await readProjectFile('app/app.vue');

    assert.match(app, /rel: 'icon', type: 'image\/svg\+xml', href: '\/favicon\.svg'/);
    assert.match(
      app,
      /key: 'site-favicon-ico',\s+rel: 'icon',\s+type: 'image\/x-icon',\s+href: '\/favicon\.ico',\s+sizes: 'any'/,
    );
    assert.match(app, /rel: 'apple-touch-icon',[\s\S]*href: '\/apple-touch-icon\.png'/);
    assert.match(app, /rel: 'manifest', href: '\/site\.webmanifest'/);
    assert.match(
      app,
      /name: 'theme-color',\s+content: '#e9e5d8',\s+media: '\(prefers-color-scheme: light\)'/,
    );
    assert.match(
      app,
      /name: 'theme-color',\s+content: '#22231f',\s+media: '\(prefers-color-scheme: dark\)'/,
    );
  });

  test('favicon保留深浅主题配色，ICO提供传统浏览器回退尺寸', async () => {
    const svg = await readProjectFile('public/favicon.svg');
    const ico = await readProjectBinary('public/favicon.ico');

    assert.match(svg, /viewBox="0 0 128 128"/);
    assert.match(svg, /prefers-color-scheme: dark/);
    assert.match(svg, /#e9e5d8/);
    assert.match(svg, /#22231f/);
    assert.match(svg, /#9d2348/);
    assert.deepEqual(readIcoSizes(ico), [
      { width: 16, height: 16 },
      { width: 32, height: 32 },
      { width: 48, height: 48 },
      { width: 64, height: 64 },
      { width: 128, height: 128 },
      { width: 256, height: 256 },
    ]);
  });

  test('Apple触控图标与Web App图标具有声明的PNG尺寸', async () => {
    const dimensions = await Promise.all([
      readProjectBinary('public/apple-touch-icon.png').then(readPngDimensions),
      readProjectBinary('public/icons/icon-192.png').then(readPngDimensions),
      readProjectBinary('public/icons/icon-512.png').then(readPngDimensions),
      readProjectBinary('public/icons/icon-512-maskable.png').then(readPngDimensions),
    ]);

    assert.deepEqual(dimensions, [
      { width: 180, height: 180 },
      { width: 192, height: 192 },
      { width: 512, height: 512 },
      { width: 512, height: 512 },
    ]);
  });

  test('Manifest以根入口启动，并为普通与可遮罩图标声明独立用途', async () => {
    const manifest = JSON.parse(await readProjectFile('public/site.webmanifest')) as WebManifest;

    assert.equal(manifest.name, "EnderLiquid's Blog");
    assert.equal(manifest.short_name, 'EnderLiquid');
    assert.equal(manifest.description, 'EnderLiquid 的博客。');
    assert.equal(manifest.start_url, '/');
    assert.equal(manifest.scope, '/');
    assert.equal(manifest.display, 'minimal-ui');
    assert.equal(manifest.background_color, '#e9e5d8');
    assert.equal(manifest.theme_color, '#e9e5d8');
    assert.deepEqual(manifest.icons, [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ]);
  });
});
