import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  calculateReadingZoomRatio,
  READING_ZOOM_VIEWPORT_COVERAGE,
  type ReadingZoomGeometry,
} from '../../app/utils/image-preview.ts';

function geometry(overrides: Partial<ReadingZoomGeometry> = {}): ReadingZoomGeometry {
  return {
    articleHeight: 70,
    articleWidth: 670,
    availableHeight: 830,
    availableWidth: 1280,
    naturalHeight: 31,
    naturalWidth: 300,
    ...overrides,
  };
}

describe('文章图片灯箱阅读尺度', () => {
  test('横向SVG至少恢复文章流中的实际尺寸', () => {
    const ratio = calculateReadingZoomRatio(geometry());

    assert.equal(ratio, 670 / 300);
  });

  test('纵向图使用扣除工具栏后的可用高度作为上限', () => {
    const ratio = calculateReadingZoomRatio(
      geometry({
        articleHeight: 415,
        articleWidth: 414,
        availableHeight: 500,
        availableWidth: 1280,
        naturalHeight: 215,
        naturalWidth: 214,
      }),
    );

    assert.equal(ratio, (500 * READING_ZOOM_VIEWPORT_COVERAGE) / 215);
  });

  test('正文或原图超过灯箱时按长边的八成钳制', () => {
    const ratio = calculateReadingZoomRatio(
      geometry({
        articleHeight: 1200,
        articleWidth: 1600,
        availableWidth: 1280,
      }),
    );

    assert.equal(ratio, (1280 * READING_ZOOM_VIEWPORT_COVERAGE) / 300);
  });

  test('高分辨率位图也会缩小到可用空间内', () => {
    const ratio = calculateReadingZoomRatio(
      geometry({
        articleHeight: 750,
        articleWidth: 1000,
        naturalHeight: 3000,
        naturalWidth: 4000,
      }),
    );

    assert.equal(ratio, (1280 * READING_ZOOM_VIEWPORT_COVERAGE) / 4000);
  });

  test('正文尺寸较小时至少按图片固有比例打开', () => {
    const ratio = calculateReadingZoomRatio(
      geometry({
        articleHeight: 75,
        articleWidth: 150,
        naturalHeight: 150,
        naturalWidth: 300,
      }),
    );

    assert.equal(ratio, 1);
  });

  test('缺失、非有限或非正的几何信息时安全降级', () => {
    for (const invalidValue of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(
        calculateReadingZoomRatio(geometry({ availableWidth: invalidValue })),
        undefined,
      );
    }
  });

  test('每次按当前可用空间重新计算恢复比例', () => {
    const wideViewport = calculateReadingZoomRatio(geometry({ availableWidth: 1280 }));
    const narrowViewport = calculateReadingZoomRatio(geometry({ availableWidth: 640 }));

    assert.equal(wideViewport, 670 / 300);
    assert.equal(narrowViewport, (640 * READING_ZOOM_VIEWPORT_COVERAGE) / 300);
  });
});
