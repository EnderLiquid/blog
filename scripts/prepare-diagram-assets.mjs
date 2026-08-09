import { prepareDiagramAssets } from './diagrams/prepare.ts';

try {
  const result = await prepareDiagramAssets();
  console.log(
    `图表资产准备完成：${result.diagramCount}张图表，` +
      `渲染${result.renderedDiagramCount}张、复用${result.reusedDiagramCount}张。`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
