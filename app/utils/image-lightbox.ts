export const LIGHTBOX_MIN_SCALE = 0.1;
export const LIGHTBOX_MAX_SCALE = 8;
export const LIGHTBOX_WHEEL_SENSITIVITY = 0.0015;
const WHEEL_LINE_HEIGHT = 16;
const WHEEL_DELTA_LINE = 1;
const WHEEL_DELTA_PAGE = 2;

export interface LightboxWheelGeometry {
  currentScale: number;
  deltaMode: number;
  deltaY: number;
  maxScale: number;
  minScale: number;
  viewportHeight: number;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function clampLightboxScale(
  scale: number,
  minScale: number,
  maxScale: number,
): number | undefined {
  if (
    !isPositiveFinite(scale) ||
    !isPositiveFinite(minScale) ||
    !isPositiveFinite(maxScale) ||
    minScale > maxScale
  ) {
    return undefined;
  }

  return Math.min(Math.max(scale, minScale), maxScale);
}

/** 将浏览器的滚轮单位规范化为像素，避免触控板和传统滚轮拥有截然不同的倍率。 */
export function normalizeLightboxWheelDelta(
  deltaY: number,
  deltaMode: number,
  viewportHeight: number,
): number | undefined {
  if (!Number.isFinite(deltaY) || !isPositiveFinite(viewportHeight)) {
    return undefined;
  }

  if (deltaMode === WHEEL_DELTA_LINE) {
    return deltaY * WHEEL_LINE_HEIGHT;
  }

  if (deltaMode === WHEEL_DELTA_PAGE) {
    return deltaY * viewportHeight;
  }

  return deltaY;
}

/** 根据滚轮方向计算下一目标缩放比例；正 deltaY 缩小，负 deltaY 放大。 */
export function calculateLightboxWheelScale(geometry: LightboxWheelGeometry): number | undefined {
  const normalizedDelta = normalizeLightboxWheelDelta(
    geometry.deltaY,
    geometry.deltaMode,
    geometry.viewportHeight,
  );

  if (normalizedDelta === undefined) {
    return undefined;
  }

  return clampLightboxScale(
    geometry.currentScale * Math.exp(-normalizedDelta * LIGHTBOX_WHEEL_SENSITIVITY),
    geometry.minScale,
    geometry.maxScale,
  );
}
