<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import type Viewer from 'viewerjs';
import {
  isArticleImageBlockAlign,
  isArticleImageInlineVerticalAlign,
  isArticleImageLayout,
  normalizeArticleImageBoolean,
  normalizeArticleImageDimensionAttribute,
  normalizeArticleImageLength,
} from '~~/shared/content/article-image.ts';
import { joinURL, withLeadingSlash, withTrailingSlash } from 'ufo';
import { useSiteLocale } from '~/composables/useSiteLocale';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    align?: string;
    alt?: string;
    caption?: string;
    darkSrc?: string;
    decoding?: string;
    height?: number | string;
    layout?: string;
    loading?: string;
    preview?: boolean | string;
    src?: string;
    title?: string;
    verticalAlign?: string;
    width?: number | string;
  }>(),
  {
    align: undefined,
    alt: '',
    caption: undefined,
    darkSrc: undefined,
    decoding: undefined,
    height: undefined,
    layout: undefined,
    loading: undefined,
    preview: undefined,
    src: '',
    title: undefined,
    verticalAlign: undefined,
    width: undefined,
  },
);

const { messages } = useSiteLocale();
const previewTrigger = ref<HTMLElement>();
const imageElement = ref<HTMLImageElement>();
const imageLoadFailed = ref(false);
const runtimeConfig = useRuntimeConfig();
const layout = computed(() => (isArticleImageLayout(props.layout) ? props.layout : 'block'));
const hasCaption = computed(() => layout.value === 'block' && Boolean(props.caption?.trim()));
const align = computed(() =>
  layout.value === 'block' && isArticleImageBlockAlign(props.align) ? props.align : 'center',
);
const verticalAlign = computed(() =>
  layout.value === 'inline' && isArticleImageInlineVerticalAlign(props.verticalAlign)
    ? props.verticalAlign
    : 'baseline',
);
const imageWidth = computed(() => normalizeArticleImageLength(props.width));
const imageHeight = computed(() => normalizeArticleImageLength(props.height));
const widthAttribute = computed(() => normalizeArticleImageDimensionAttribute(props.width));
const heightAttribute = computed(() => normalizeArticleImageDimensionAttribute(props.height));
const previewEnabled = computed(
  () => props.alt !== '' && normalizeArticleImageBoolean(props.preview, props.alt !== ''),
);
const loading = computed(() =>
  props.loading === 'lazy' || props.loading === 'eager' ? props.loading : undefined,
);
const decoding = computed(() =>
  props.decoding === 'async' || props.decoding === 'sync' || props.decoding === 'auto'
    ? props.decoding
    : undefined,
);

function refineSource(source: string): string {
  if (source.startsWith('/') && !source.startsWith('//')) {
    const baseUrl = withLeadingSlash(withTrailingSlash(runtimeConfig.app.baseURL));

    if (baseUrl !== '/' && !source.startsWith(baseUrl)) {
      return joinURL(baseUrl, source);
    }
  }

  return source;
}

const refinedSrc = computed(() => refineSource(props.src));
const refinedDarkSrc = computed(() => (props.darkSrc ? refineSource(props.darkSrc) : undefined));
const previewLabel = computed(() => messages.value.article.image.open(props.alt));
const rootClasses = computed(() => [
  'article-image',
  `article-image--${layout.value}`,
  {
    'article-image--has-caption': hasCaption.value,
    'article-image--has-width': Boolean(imageWidth.value),
  },
]);
const rootStyles = computed(() => {
  const styles: Record<string, string> = {};

  if (imageWidth.value) {
    styles['--article-image-width'] = imageWidth.value;
  }

  if (layout.value === 'inline') {
    styles['--article-image-vertical-align'] = verticalAlign.value;
  }

  return styles;
});
const imageStyles = computed(() => {
  const styles: Record<string, string> = {};

  if (imageHeight.value) {
    styles.blockSize = imageHeight.value;
  }

  return styles;
});

function handleImageError(): void {
  imageLoadFailed.value = true;
}

let activeViewer: Viewer | undefined;
let isDisposed = false;
let isPreviewOpening = false;
let viewerDependencies:
  Promise<[typeof import('v-viewer'), typeof import('viewerjs/dist/viewer.css')]> | undefined;

function loadViewer() {
  viewerDependencies ??= Promise.all([import('v-viewer'), import('viewerjs/dist/viewer.css')]);

  return viewerDependencies;
}

function restorePreviewTriggerFocus(): void {
  requestAnimationFrame(() => {
    if (!isDisposed) {
      previewTrigger.value?.focus();
    }
  });
}

function activateViewerControlWithSpace(event: KeyboardEvent): void {
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    (event.currentTarget as HTMLElement).click();
  }
}

function trapViewerFocus(event: KeyboardEvent): void {
  if (event.key !== 'Tab') {
    return;
  }

  const viewer = event.currentTarget as HTMLElement;
  const focusableControls = [
    viewer.querySelector<HTMLElement>('.viewer-button'),
    ...viewer.querySelectorAll<HTMLElement>('.viewer-toolbar [tabindex]'),
  ].filter((control): control is HTMLElement => Boolean(control));

  if (focusableControls.length === 0) {
    return;
  }

  const currentIndex = focusableControls.indexOf(document.activeElement as HTMLElement);
  const direction = event.shiftKey ? -1 : 1;
  const nextIndex =
    currentIndex === -1
      ? event.shiftKey
        ? focusableControls.length - 1
        : 0
      : (currentIndex + direction + focusableControls.length) % focusableControls.length;

  event.preventDefault();
  focusableControls[nextIndex]?.focus();
}

function configureViewerAccessibility(): void {
  const viewer = document.querySelector<HTMLElement>('.article-image-viewer');

  if (!viewer) {
    return;
  }

  const imageMessages = messages.value.article.image;
  viewer.setAttribute('aria-label', imageMessages.preview(props.alt));
  viewer.removeAttribute('aria-labelledby');
  viewer.addEventListener('keydown', trapViewerFocus);

  for (const navigationItem of viewer.querySelectorAll<HTMLElement>('.viewer-list [tabindex]')) {
    navigationItem.removeAttribute('tabindex');
  }

  const controls = [
    ['.viewer-button', imageMessages.close],
    ['.viewer-zoom-in', imageMessages.zoomIn],
    ['.viewer-zoom-out', imageMessages.zoomOut],
    ['.viewer-reset', imageMessages.reset],
  ] as const;

  for (const [selector, label] of controls) {
    const control = viewer.querySelector<HTMLElement>(selector);

    if (!control) {
      continue;
    }

    control.setAttribute('aria-label', label);
    control.addEventListener('keydown', activateViewerControlWithSpace);
  }

  requestAnimationFrame(() => {
    if (!isDisposed) {
      viewer.querySelector<HTMLElement>('.viewer-button')?.focus();
    }
  });
}

function handlePreviewClick(event: MouseEvent): void {
  if (previewEnabled.value && !imageLoadFailed.value) {
    void openPreview(event);
  }
}

function handlePreviewKeydown(event: KeyboardEvent): void {
  if (
    !previewEnabled.value ||
    imageLoadFailed.value ||
    (event.key !== 'Enter' && event.key !== ' ')
  ) {
    return;
  }

  event.preventDefault();
  void openPreview(new MouseEvent('click', { button: 0 }));
}

function getPreviewSource(): string {
  return imageElement.value?.currentSrc || refinedSrc.value;
}

async function openPreview(event: MouseEvent): Promise<void> {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    isPreviewOpening ||
    activeViewer
  ) {
    return;
  }

  event.preventDefault();
  isPreviewOpening = true;

  try {
    const [{ api }] = await loadViewer();

    if (isDisposed) {
      return;
    }

    activeViewer = api({
      images: [
        {
          alt: props.alt,
          src: getPreviewSource(),
          title: props.title,
        },
      ],
      options: {
        backdrop: true,
        button: true,
        className: 'article-image-viewer',
        focus: true,
        keyboard: true,
        loading: true,
        loop: false,
        movable: true,
        navbar: false,
        rotatable: false,
        scalable: false,
        title: false,
        toggleOnDblclick: true,
        toolbar: {
          reset: true,
          zoomIn: true,
          zoomOut: true,
        },
        tooltip: false,
        transition: true,
        viewed: configureViewerAccessibility,
        hidden: () => {
          activeViewer = undefined;
          restorePreviewTriggerFocus();
        },
        zoomable: true,
      },
    });
  } catch {
    // 按需加载失败时保留普通链接的降级能力，直接打开当前实际图片源。
    globalThis.location.assign(getPreviewSource());
  } finally {
    isPreviewOpening = false;
  }
}

onBeforeUnmount(() => {
  isDisposed = true;
  activeViewer?.destroy();
  activeViewer = undefined;
});
</script>

<template>
  <component
    :is="hasCaption ? 'figure' : 'span'"
    :class="rootClasses"
    :style="rootStyles"
    :data-align="layout === 'block' ? align : undefined"
  >
    <component
      :is="previewEnabled ? 'a' : 'span'"
      ref="previewTrigger"
      class="article-image__media"
      :class="{ 'is-load-failed': imageLoadFailed }"
      :href="previewEnabled ? refinedSrc : undefined"
      :aria-label="previewEnabled && !imageLoadFailed ? previewLabel : undefined"
      @click="handlePreviewClick"
      @keydown="handlePreviewKeydown"
    >
      <picture class="article-image__picture">
        <source
          v-if="refinedDarkSrc"
          media="(prefers-color-scheme: dark)"
          :srcset="refinedDarkSrc"
        />
        <img
          ref="imageElement"
          v-bind="$attrs"
          :style="imageStyles"
          :src="refinedSrc"
          :alt="props.alt"
          :width="widthAttribute"
          :height="heightAttribute"
          :title="props.title"
          :loading="loading"
          :decoding="decoding"
          @error="handleImageError"
        />
      </picture>
    </component>
    <figcaption v-if="hasCaption">{{ props.caption }}</figcaption>
  </component>
</template>

<style scoped>
:global(.viewer-container.article-image-viewer) {
  color: var(--ink);
  font-family: var(--font-mono);
}

:global(.viewer-container.article-image-viewer.viewer-backdrop) {
  background: color-mix(in srgb, var(--code-paper) 88%, transparent);
}

:global(.viewer-container.article-image-viewer .viewer-button) {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--line);
  border-radius: 0;
  place-items: center;
  background: var(--paper);
}

:global(.viewer-container.article-image-viewer .viewer-button::before) {
  position: static;
  width: auto;
  height: auto;
  margin: 0;
  color: currentColor;
  background: none;
  content: '×';
  font-family: var(--font-mono);
  font-size: 1.5rem;
  line-height: 1;
}

:global(.viewer-container.article-image-viewer .viewer-button:focus),
:global(.viewer-container.article-image-viewer .viewer-toolbar > ul > li:focus) {
  box-shadow: none;
  outline: none;
}

:global(.viewer-container.article-image-viewer .viewer-button:hover),
:global(.viewer-container.article-image-viewer .viewer-button:focus-visible) {
  color: var(--signal);
  background: color-mix(in srgb, var(--signal) 8%, var(--paper));
  box-shadow: none;
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

:global(.viewer-container.article-image-viewer .viewer-footer) {
  overflow: visible;
}

:global(.viewer-container.article-image-viewer .viewer-toolbar > ul) {
  display: inline-flex;
  gap: 0.35rem;
  margin: 0 auto 1.25rem;
  overflow: visible;
  padding: 0;
}

:global(.viewer-container.article-image-viewer .viewer-toolbar > ul > li) {
  display: grid;
  float: none;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--line);
  border-radius: 0;
  place-items: center;
  color: var(--ink);
  background: var(--paper);
}

:global(.viewer-container.article-image-viewer .viewer-toolbar > ul > li + li) {
  margin-left: 0;
}

:global(.viewer-container.article-image-viewer .viewer-toolbar > ul > li::before) {
  width: auto;
  height: auto;
  margin: 0;
  color: currentColor;
  background: none;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1;
}

:global(.viewer-container.article-image-viewer .viewer-zoom-in::before) {
  content: '+';
  font-size: 1.1rem;
}

:global(.viewer-container.article-image-viewer .viewer-zoom-out::before) {
  content: '−';
  font-size: 1.1rem;
}

:global(.viewer-container.article-image-viewer .viewer-reset::before) {
  content: '1:1';
}

:global(.viewer-container.article-image-viewer .viewer-toolbar > ul > li:hover),
:global(.viewer-container.article-image-viewer .viewer-toolbar > ul > li:focus-visible) {
  color: var(--signal);
  background: color-mix(in srgb, var(--signal) 8%, var(--paper));
  box-shadow: none;
  outline: 2px solid var(--signal);
  outline-offset: 0;
}

:global(.viewer-container.article-image-viewer .viewer-loading::after) {
  border-radius: 0;
}

@media (prefers-reduced-motion: reduce) {
  :global(.viewer-container.article-image-viewer.viewer-transition),
  :global(.viewer-container.article-image-viewer .viewer-transition),
  :global(.viewer-container.article-image-viewer .viewer-loading::after) {
    transition: none !important;
    animation: none !important;
  }
}
</style>
