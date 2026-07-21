import { generateSiteManifest } from './site-manifest/generate.ts';

try {
  const result = await generateSiteManifest();
  console.log(
    `站点资源清单生成完成：${result.resourceCount}个资源，` +
      `其中${result.articleCount}个真实文章页面、${result.fallbackArticleCount}个回退投递页面。`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
