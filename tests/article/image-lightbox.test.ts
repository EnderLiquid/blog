import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  calculateLightboxWheelScale,
  clampLightboxScale,
  normalizeLightboxWheelDelta,
  LIGHTBOX_MAX_SCALE,
  LIGHTBOX_MIN_SCALE,
} from '../../app/utils/image-lightbox.ts';

describe('文章图片自研灯箱变换', () => {
  test('缩放比例在明确的安全范围内钳制', () => {
    assert.equal(clampLightboxScale(0.01, LIGHTBOX_MIN_SCALE, LIGHTBOX_MAX_SCALE), 0.1);
    assert.equal(clampLightboxScale(12, LIGHTBOX_MIN_SCALE, LIGHTBOX_MAX_SCALE), 12);
    assert.equal(clampLightboxScale(20, LIGHTBOX_MIN_SCALE, LIGHTBOX_MAX_SCALE), 16);
    assert.equal(clampLightboxScale(2.5, LIGHTBOX_MIN_SCALE, LIGHTBOX_MAX_SCALE), 2.5);
    assert.equal(clampLightboxScale(Number.NaN, LIGHTBOX_MIN_SCALE, LIGHTBOX_MAX_SCALE), undefined);
    assert.equal(clampLightboxScale(1, 2, 1), undefined);
  });

  test('将行和页滚轮单位规范化为像素', () => {
    assert.equal(normalizeLightboxWheelDelta(3, 0, 900), 3);
    assert.equal(normalizeLightboxWheelDelta(3, 1, 900), 48);
    assert.equal(normalizeLightboxWheelDelta(1, 2, 900), 900);
    assert.equal(normalizeLightboxWheelDelta(1, 2, 0), undefined);
  });

  test('滚轮向上放大、向下缩小并保持范围限制', () => {
    const zoomIn = calculateLightboxWheelScale({
      currentScale: 1,
      deltaMode: 0,
      deltaY: -120,
      maxScale: LIGHTBOX_MAX_SCALE,
      minScale: LIGHTBOX_MIN_SCALE,
      viewportHeight: 900,
    });
    const zoomOut = calculateLightboxWheelScale({
      currentScale: 1,
      deltaMode: 0,
      deltaY: 120,
      maxScale: LIGHTBOX_MAX_SCALE,
      minScale: LIGHTBOX_MIN_SCALE,
      viewportHeight: 900,
    });

    assert.ok(zoomIn && zoomIn > 1);
    assert.ok(zoomOut && zoomOut < 1);
    assert.equal(
      calculateLightboxWheelScale({
        currentScale: 7.9,
        deltaMode: 0,
        deltaY: -10_000,
        maxScale: LIGHTBOX_MAX_SCALE,
        minScale: LIGHTBOX_MIN_SCALE,
        viewportHeight: 900,
      }),
      LIGHTBOX_MAX_SCALE,
    );
  });
});
