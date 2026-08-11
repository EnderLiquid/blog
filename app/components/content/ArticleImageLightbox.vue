<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import type { PanzoomObject } from '@panzoom/panzoom';
import { useSiteLocale } from '~/composables/useSiteLocale';
import {
  calculateLightboxFocalPoint,
  calculateLightboxWheelScale,
  clampLightboxScale,
  LIGHTBOX_MAX_SCALE,
  LIGHTBOX_MIN_SCALE,
  type LightboxFocalPoint,
} from '~/utils/image-lightbox';
import { calculateReadingZoomRatio } from '~/utils/image-preview';

const props = defineProps<{
  alt: string;
  articleImage: HTMLImageElement;
  src: string;
  title?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { messages } = useSiteLocale();
const dialogElement = ref<HTMLDialogElement>();
const canvasElement = ref<HTMLElement>();
const imageFrameElement = ref<HTMLElement>();
const imageElement = ref<HTMLImageElement>();
const closeButton = ref<HTMLButtonElement>();
const imageStatus = ref<'loading' | 'ready' | 'error'>('loading');
const imageDimensions = ref<Record<string, string>>();
const isReady = ref(false);
const lightboxLabel = computed(() => messages.value.article.image.preview(props.alt));
const imageMessages = computed(() => messages.value.article.image);

const BACKDROP_CLICK_TOLERANCE = 6;
const LIGHTBOX_TRANSITION_DURATION = 180;
const LIGHTBOX_TRANSITION_EASING = 'cubic-bezier(0.2, 0, 0, 1)';
const WHEEL_EASING_FACTOR = 0.28;
const WHEEL_SETTLE_THRESHOLD = 0.001;

interface BackdropPointerGesture {
  pointerId: number;
  startedOnBackdrop: boolean;
  startX: number;
  startY: number;
  hasMoved: boolean;
}

let panzoom: PanzoomObject | undefined;
let resizeObserver: ResizeObserver | undefined;
let releaseDocumentScroll: (() => void) | undefined;
let wheelAnimationFrame: number | undefined;
let wheelTargetScale: number | undefined;
let wheelFocalPoint: LightboxFocalPoint | undefined;
let isDisposed = false;
let isCleanedUp = false;
let preparationVersion = 0;
let backdropPointerGesture: BackdropPointerGesture | undefined;

interface ScrollLockSnapshot {
  bodyLeft: string;
  bodyPosition: string;
  bodyRight: string;
  bodyTop: string;
  bodyWidth: string;
  rootOverflow: string;
  scrollX: number;
  scrollY: number;
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function lockDocumentScroll(): () => void {
  const root = document.documentElement;
  const body = document.body;
  const snapshot: ScrollLockSnapshot = {
    bodyLeft: body.style.left,
    bodyPosition: body.style.position,
    bodyRight: body.style.right,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    rootOverflow: root.style.overflow,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };

  root.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${snapshot.scrollY}px`;
  body.style.left = `-${snapshot.scrollX}px`;
  body.style.right = '0';
  body.style.width = '100%';

  return () => {
    root.style.overflow = snapshot.rootOverflow;
    body.style.position = snapshot.bodyPosition;
    body.style.top = snapshot.bodyTop;
    body.style.left = snapshot.bodyLeft;
    body.style.right = snapshot.bodyRight;
    body.style.width = snapshot.bodyWidth;
    window.scrollTo(snapshot.scrollX, snapshot.scrollY);
  };
}

function cancelWheelAnimation(): void {
  if (wheelAnimationFrame !== undefined) {
    cancelAnimationFrame(wheelAnimationFrame);
  }

  wheelAnimationFrame = undefined;
  wheelTargetScale = undefined;
  wheelFocalPoint = undefined;
}

function getReadingScale(): number | undefined {
  const canvas = canvasElement.value;
  const image = imageElement.value;

  if (!canvas || !image) {
    return undefined;
  }

  const articleRect = props.articleImage.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const scale = calculateReadingZoomRatio({
    articleHeight: articleRect.height,
    articleWidth: articleRect.width,
    availableHeight: canvasRect.height,
    availableWidth: canvasRect.width,
    naturalHeight: image.naturalHeight,
    naturalWidth: image.naturalWidth,
  });

  return scale === undefined
    ? undefined
    : clampLightboxScale(scale, LIGHTBOX_MIN_SCALE, LIGHTBOX_MAX_SCALE);
}

function zoomTo(scale: number | undefined, animate: boolean, focal?: LightboxFocalPoint): void {
  if (scale === undefined || !panzoom) {
    return;
  }

  panzoom.zoom(scale, {
    animate,
    focal,
  });
}

function restoreReadingSize(): void {
  cancelWheelAnimation();

  const readingScale = getReadingScale();

  if (!panzoom || readingScale === undefined) {
    return;
  }

  panzoom.setOptions({
    startScale: readingScale,
    startX: 0,
    startY: 0,
  });
  panzoom.reset({ animate: !prefersReducedMotion() });
}

function showOriginalSize(): void {
  cancelWheelAnimation();
  zoomTo(1, !prefersReducedMotion());
}

function zoomIn(): void {
  cancelWheelAnimation();
  panzoom?.zoomIn({ animate: !prefersReducedMotion() });
}

function zoomOut(): void {
  cancelWheelAnimation();
  panzoom?.zoomOut({ animate: !prefersReducedMotion() });
}

function toggleDoubleClickZoom(): void {
  cancelWheelAnimation();

  if (!panzoom) {
    return;
  }

  const readingScale = getReadingScale();

  if (readingScale === undefined) {
    return;
  }

  const targetScale =
    Math.abs(panzoom.getScale() - readingScale) < WHEEL_SETTLE_THRESHOLD ? 1 : readingScale;

  zoomTo(targetScale, !prefersReducedMotion());
}

function getWheelFocalPoint(event: WheelEvent): LightboxFocalPoint | undefined {
  const image = imageElement.value;

  if (!image) {
    return undefined;
  }

  const rect = image.getBoundingClientRect();

  return calculateLightboxFocalPoint({
    clientX: event.clientX,
    clientY: event.clientY,
    imageHeight: image.offsetHeight,
    imageLeft: rect.left,
    imageTop: rect.top,
    imageWidth: image.offsetWidth,
    renderedHeight: rect.height,
    renderedWidth: rect.width,
  });
}

function applyWheelTarget(): void {
  const targetScale = wheelTargetScale;

  if (!panzoom || targetScale === undefined) {
    cancelWheelAnimation();
    return;
  }

  const currentScale = panzoom.getScale();
  const nextScale =
    Math.abs(targetScale - currentScale) < WHEEL_SETTLE_THRESHOLD
      ? targetScale
      : currentScale + (targetScale - currentScale) * WHEEL_EASING_FACTOR;

  zoomTo(nextScale, false, wheelFocalPoint);

  if (nextScale === targetScale) {
    cancelWheelAnimation();
    return;
  }

  wheelAnimationFrame = requestAnimationFrame(applyWheelTarget);
}

function handleCanvasWheel(event: WheelEvent): void {
  if (!panzoom) {
    return;
  }

  event.preventDefault();
  const targetScale = calculateLightboxWheelScale({
    currentScale: wheelTargetScale ?? panzoom.getScale(),
    deltaMode: event.deltaMode,
    deltaY: event.deltaY,
    maxScale: LIGHTBOX_MAX_SCALE,
    minScale: LIGHTBOX_MIN_SCALE,
    viewportHeight: canvasElement.value?.getBoundingClientRect().height ?? window.innerHeight,
  });

  if (targetScale === undefined) {
    return;
  }

  wheelTargetScale = targetScale;
  wheelFocalPoint = getWheelFocalPoint(event);

  if (prefersReducedMotion()) {
    zoomTo(targetScale, false, wheelFocalPoint);
    cancelWheelAnimation();
    return;
  }

  if (wheelAnimationFrame === undefined) {
    wheelAnimationFrame = requestAnimationFrame(applyWheelTarget);
  }
}

function refreshPanzoomLayout(): void {
  if (!panzoom) {
    return;
  }

  cancelWheelAnimation();
  zoomTo(panzoom.getScale(), false);
}

async function prepareImage(): Promise<void> {
  const image = imageElement.value;
  const canvas = canvasElement.value;
  const currentPreparation = ++preparationVersion;

  if (!image || !canvas || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    imageStatus.value = 'error';
    return;
  }

  imageDimensions.value = {
    height: `${image.naturalHeight}px`,
    width: `${image.naturalWidth}px`,
  };
  await nextTick();

  try {
    const { default: Panzoom } = await import('@panzoom/panzoom');

    if (isDisposed || currentPreparation !== preparationVersion || !image.isConnected) {
      return;
    }

    panzoom?.destroy();
    const initialScale = getReadingScale() ?? 1;
    // 零位移由画布的 Grid 居中；inside containment 会在阅读尺度下推导出单侧边界，
    // 因而把图像锁向左上方。保留自由平移，⟳ 始终可恢复居中的阅读尺度。
    panzoom = Panzoom(image, {
      animate: true,
      canvas: true,
      duration: LIGHTBOX_TRANSITION_DURATION,
      easing: LIGHTBOX_TRANSITION_EASING,
      maxScale: LIGHTBOX_MAX_SCALE,
      minScale: LIGHTBOX_MIN_SCALE,
      panOnlyWhenZoomed: false,
      startScale: initialScale,
      startX: 0,
      startY: 0,
      touchAction: 'none',
    });
    imageStatus.value = 'ready';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!isDisposed && currentPreparation === preparationVersion) {
          isReady.value = true;
        }
      });
    });
  } catch {
    imageStatus.value = 'error';
  }
}

function handleImageLoad(): void {
  isReady.value = false;
  imageStatus.value = 'loading';
  void prepareImage();
}

function handleImageError(): void {
  ++preparationVersion;
  imageStatus.value = 'error';
  isReady.value = false;
}

function requestClose(): void {
  const dialog = dialogElement.value;

  if (dialog?.open) {
    dialog.close();
  }
}

function handleDialogCancel(event: Event): void {
  event.preventDefault();
  requestClose();
}

function trapDialogFocus(event: KeyboardEvent): void {
  if (event.key !== 'Tab') {
    return;
  }

  const dialog = dialogElement.value;
  const controls = dialog
    ? [...dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])')]
    : [];

  if (controls.length === 0) {
    return;
  }

  const currentIndex = controls.indexOf(document.activeElement as HTMLButtonElement);
  const firstIndex = 0;
  const lastIndex = controls.length - 1;

  if (currentIndex === -1 || (!event.shiftKey && currentIndex === lastIndex)) {
    event.preventDefault();
    controls[firstIndex]?.focus();
    return;
  }

  if (event.shiftKey && currentIndex === firstIndex) {
    event.preventDefault();
    controls[lastIndex]?.focus();
  }
}

function beganBackdropPointerGesture(event: PointerEvent): void {
  if (!event.isPrimary || event.button !== 0) {
    return;
  }

  const target = event.target;
  backdropPointerGesture = {
    pointerId: event.pointerId,
    startedOnBackdrop: target === canvasElement.value || target === imageFrameElement.value,
    startX: event.clientX,
    startY: event.clientY,
    hasMoved: false,
  };
}

function trackBackdropPointerGesture(event: PointerEvent): void {
  const gesture = backdropPointerGesture;

  if (!gesture || gesture.pointerId !== event.pointerId || gesture.hasMoved) {
    return;
  }

  gesture.hasMoved =
    Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >
    BACKDROP_CLICK_TOLERANCE;
}

function isPointInsideCanvas(clientX: number, clientY: number): boolean {
  const canvas = canvasElement.value;

  if (!canvas) {
    return false;
  }

  const rect = canvas.getBoundingClientRect();
  return (
    clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  );
}

function finishBackdropPointerGesture(event: PointerEvent): void {
  const gesture = backdropPointerGesture;

  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }

  backdropPointerGesture = undefined;

  if (
    gesture.startedOnBackdrop &&
    !gesture.hasMoved &&
    isPointInsideCanvas(event.clientX, event.clientY)
  ) {
    requestClose();
  }
}

function cancelBackdropPointerGesture(event: PointerEvent): void {
  if (backdropPointerGesture?.pointerId === event.pointerId) {
    backdropPointerGesture = undefined;
  }
}

function cleanUp(): void {
  if (isCleanedUp) {
    return;
  }

  isCleanedUp = true;
  ++preparationVersion;
  backdropPointerGesture = undefined;
  cancelWheelAnimation();
  document.removeEventListener('pointermove', trackBackdropPointerGesture, true);
  document.removeEventListener('pointerup', finishBackdropPointerGesture, true);
  document.removeEventListener('pointercancel', cancelBackdropPointerGesture, true);
  resizeObserver?.disconnect();
  resizeObserver = undefined;
  panzoom?.destroy();
  panzoom = undefined;
  releaseDocumentScroll?.();
  releaseDocumentScroll = undefined;
}

function handleDialogClose(): void {
  cleanUp();
  emit('close');
}

onMounted(() => {
  const dialog = dialogElement.value;

  if (!dialog) {
    emit('close');
    return;
  }

  try {
    dialog.showModal();
  } catch {
    emit('close');
    return;
  }

  releaseDocumentScroll = lockDocumentScroll();
  resizeObserver = new ResizeObserver(refreshPanzoomLayout);
  document.addEventListener('pointermove', trackBackdropPointerGesture, true);
  document.addEventListener('pointerup', finishBackdropPointerGesture, true);
  document.addEventListener('pointercancel', cancelBackdropPointerGesture, true);

  if (canvasElement.value) {
    resizeObserver.observe(canvasElement.value);
  }

  void nextTick(() => {
    closeButton.value?.focus();

    if (imageElement.value?.complete) {
      if (imageElement.value.naturalWidth > 0) {
        handleImageLoad();
      } else {
        handleImageError();
      }
    }
  });
});

onBeforeUnmount(() => {
  isDisposed = true;
  cleanUp();
});
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogElement"
      class="article-image-lightbox"
      :aria-label="lightboxLabel"
      @cancel="handleDialogCancel"
      @keydown="trapDialogFocus"
      @close="handleDialogClose"
    >
      <div
        ref="canvasElement"
        class="article-image-lightbox__canvas"
        @pointerdown.capture="beganBackdropPointerGesture"
        @dblclick="toggleDoubleClickZoom"
        @wheel="handleCanvasWheel"
      >
        <div
          ref="imageFrameElement"
          class="article-image-lightbox__image-frame"
          :class="{ 'is-ready': isReady }"
        >
          <img
            ref="imageElement"
            class="article-image-lightbox__image"
            :src="src"
            :alt="alt"
            :title="title"
            :style="imageDimensions"
            draggable="false"
            :aria-busy="imageStatus === 'loading'"
            @error="handleImageError"
            @load="handleImageLoad"
          />
        </div>
        <p v-if="imageStatus === 'loading'" class="article-image-lightbox__status" role="status">
          {{ imageMessages.loading }}
        </p>
        <p v-else-if="imageStatus === 'error'" class="article-image-lightbox__status" role="status">
          {{ imageMessages.loadFailed }}
        </p>
      </div>

      <button
        ref="closeButton"
        class="article-image-lightbox__close"
        type="button"
        :aria-label="imageMessages.close"
        @click="requestClose"
      >
        ×
      </button>

      <div class="article-image-lightbox__toolbar" :aria-label="lightboxLabel" role="toolbar">
        <button
          type="button"
          :aria-label="imageMessages.restoreReadingSize"
          @click="restoreReadingSize"
        >
          ⟳
        </button>
        <button type="button" :aria-label="imageMessages.originalSize" @click="showOriginalSize">
          1:1
        </button>
        <button type="button" :aria-label="imageMessages.zoomIn" @click="zoomIn">+</button>
        <button type="button" :aria-label="imageMessages.zoomOut" @click="zoomOut">−</button>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.article-image-lightbox {
  width: 100dvw;
  max-width: none;
  height: 100dvh;
  max-height: none;
  margin: 0;
  padding: 0;
  overflow: hidden;
  color: var(--ink);
  border: 0;
  background: transparent;
  font-family: var(--font-mono);
}

.article-image-lightbox::backdrop {
  background: color-mix(in srgb, var(--paper) 92%, transparent);
}

.article-image-lightbox__canvas {
  position: absolute;
  inset: 0 0 4.5rem;
  display: grid;
  overflow: hidden;
  place-items: center;
  touch-action: none;
}

.article-image-lightbox__image-frame {
  position: absolute;
  inset: 0;
  display: grid;
  overflow: hidden;
  opacity: 0;
  place-items: center;
  transition: opacity 160ms ease-out;
}

.article-image-lightbox__image-frame.is-ready {
  opacity: 1;
}

.article-image-lightbox__image {
  display: block;
  max-width: none;
  max-height: none;
  user-select: none;
  -webkit-user-drag: none;
}

.article-image-lightbox__status {
  position: absolute;
  margin: 0;
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 0.82rem;
}

.article-image-lightbox__close,
.article-image-lightbox__toolbar button {
  display: grid;
  border: 1px solid var(--line);
  border-radius: 0;
  color: var(--ink);
  background: var(--paper);
  font: inherit;
  place-items: center;
}

.article-image-lightbox__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  font-size: 1.5rem;
  line-height: 1;
}

.article-image-lightbox__toolbar {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  left: 1rem;
  display: flex;
  justify-content: center;
  gap: 0.35rem;
}

.article-image-lightbox__toolbar button {
  width: 2rem;
  height: 2rem;
  padding: 0;
  font-size: 0.82rem;
  line-height: 1;
}

.article-image-lightbox__toolbar button:first-child {
  font-family: var(--font-mono), system-ui, sans-serif;
  font-size: 1.15rem;
}

.article-image-lightbox__toolbar button:nth-child(3),
.article-image-lightbox__toolbar button:nth-child(4) {
  font-size: 1.1rem;
}

.article-image-lightbox__close:hover,
.article-image-lightbox__close:focus-visible,
.article-image-lightbox__toolbar button:focus-visible {
  color: var(--signal);
  background: color-mix(in srgb, var(--signal) 8%, var(--paper));
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

.article-image-lightbox__toolbar button:hover {
  border-color: var(--signal);
  background: color-mix(in srgb, var(--signal) 8%, var(--paper));
}

@media (prefers-color-scheme: dark) {
  .article-image-lightbox::backdrop {
    background: rgb(0 0 0 / 0.78);
  }
}

@media (prefers-reduced-motion: reduce) {
  .article-image-lightbox__image-frame {
    transition: none;
  }
}
</style>
