export const READING_ZOOM_VIEWPORT_COVERAGE = 0.8;

export interface ReadingZoomGeometry {
  articleHeight: number;
  articleWidth: number;
  availableHeight: number;
  availableWidth: number;
  naturalHeight: number;
  naturalWidth: number;
}

/**
 * 根据图片固有长边、正文实际长边和灯箱可用长边计算适合阅读的绝对缩放比例。
 * 无法取得完整有效几何信息时返回 undefined，让 ViewerJS 保持自身的安全默认布局。
 */
export function calculateReadingZoomRatio(geometry: ReadingZoomGeometry): number | undefined {
  const values = Object.values(geometry);

  if (!values.every((value) => Number.isFinite(value) && value > 0)) {
    return undefined;
  }

  const naturalLongEdge = Math.max(geometry.naturalWidth, geometry.naturalHeight);
  const articleLongEdge = Math.max(geometry.articleWidth, geometry.articleHeight);
  const availableLongEdge =
    geometry.naturalWidth >= geometry.naturalHeight
      ? geometry.availableWidth
      : geometry.availableHeight;
  const targetLongEdge = Math.min(
    Math.max(naturalLongEdge, articleLongEdge),
    availableLongEdge * READING_ZOOM_VIEWPORT_COVERAGE,
  );
  const ratio = targetLongEdge / naturalLongEdge;

  return Number.isFinite(ratio) && ratio > 0 ? ratio : undefined;
}
