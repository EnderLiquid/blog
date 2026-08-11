<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import type { Component } from 'vue';
import { useSiteLocale } from '~/composables/useSiteLocale';
import {
  isArticleImageBlockAlign,
  isArticleImageInlineVerticalAlign,
  isArticleImageLayout,
  normalizeArticleImageBoolean,
  normalizeArticleImageDimensionAttribute,
  normalizeArticleImageLength,
} from '~~/shared/content/article-image.ts';
import { joinURL, withLeadingSlash, withTrailingSlash } from 'ufo';

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
const previewOpen = ref(false);
const previewSource = ref('');
const lightboxComponent = shallowRef<Component>();
const isPreviewOpening = ref(false);
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

function getPreviewSource(): string {
  return imageElement.value?.currentSrc || refinedSrc.value;
}

async function openPreview(event: MouseEvent): Promise<void> {
  if (
    !previewEnabled.value ||
    imageLoadFailed.value ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    previewOpen.value ||
    isPreviewOpening.value
  ) {
    return;
  }

  event.preventDefault();
  const source = getPreviewSource();
  isPreviewOpening.value = true;

  try {
    const { default: lightbox } = await import('./ArticleImageLightbox.vue');

    previewSource.value = source;
    lightboxComponent.value = lightbox;
    previewOpen.value = true;
  } catch {
    // 按需加载失败时保留普通链接的降级能力，直接打开当前实际图片源。
    globalThis.location.assign(source);
  } finally {
    isPreviewOpening.value = false;
  }
}

function handlePreviewClick(event: MouseEvent): void {
  void openPreview(event);
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

function handleLightboxClose(): void {
  previewOpen.value = false;
  lightboxComponent.value = undefined;

  requestAnimationFrame(() => {
    previewTrigger.value?.focus();
  });
}
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

  <component
    :is="lightboxComponent"
    v-if="previewOpen && imageElement && lightboxComponent"
    :alt="props.alt"
    :article-image="imageElement"
    :src="previewSource"
    :title="props.title"
    @close="handleLightboxClose"
  />
</template>
