import { prepareDiagramAssets } from './diagrams/prepare.ts';
import { generateSiteManifest } from './site-manifest/generate.ts';

try {
  const diagrams = await prepareDiagramAssets();
  const result = await generateSiteManifest();
  console.log(
    `图表资产准备完成：${diagrams.diagramCount}张图表，` +
      `渲染${diagrams.renderedDiagramCount}张、复用${diagrams.reusedDiagramCount}张。\n` +
      `站点资源清单生成完成：${result.resourceCount}个资源，` +
      `其中${result.articleCount}个真实文章页面、${result.fallbackArticleCount}个回退投递页面。`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
