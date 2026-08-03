<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useSiteLocale } from '~/composables/useSiteLocale';

const props = withDefaults(
  defineProps<{
    class?: string;
    code?: string;
    filename?: string | null;
    highlights?: number[];
    language?: string | null;
    meta?: string | null;
  }>(),
  {
    class: undefined,
    code: '',
    filename: null,
    highlights: () => [],
    language: null,
    meta: null,
  },
);

const { messages } = useSiteLocale();
const copySucceeded = ref(false);
let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

const copyLabel = computed(() =>
  copySucceeded.value ? messages.value.article.codeCopied : messages.value.article.copyCode,
);

function clearCopyResetTimer(): void {
  if (copyResetTimer) {
    clearTimeout(copyResetTimer);
    copyResetTimer = undefined;
  }
}

function scheduleCopyReset(): void {
  clearCopyResetTimer();
  copyResetTimer = setTimeout(() => {
    copySucceeded.value = false;
    copyResetTimer = undefined;
  }, 1800);
}

async function copyCode(): Promise<void> {
  clearCopyResetTimer();
  copySucceeded.value = false;

  try {
    if (!globalThis.navigator?.clipboard?.writeText) {
      return;
    }

    await globalThis.navigator.clipboard.writeText(props.code);
    copySucceeded.value = true;
    scheduleCopyReset();
  } catch {
    // 剪贴板权限或浏览器兼容性失败时保持静默，按钮维持默认状态。
  }
}

onBeforeUnmount(clearCopyResetTimer);
</script>

<template>
  <div class="article-code-block">
    <div class="article-code-block__header">
      <span
        v-if="props.filename || props.language"
        class="article-code-block__label"
        :class="{ 'is-language': !props.filename }"
      >
        {{ props.filename ?? props.language }}
      </span>
      <div class="article-code-block__actions">
        <template v-if="props.filename && props.language">
          <span class="article-code-block__language">{{ props.language }}</span>
          <span class="article-code-block__action-divider" aria-hidden="true" />
        </template>
        <button
          class="article-code-block__copy"
          type="button"
          :aria-label="copyLabel"
          @click="copyCode"
        >
          <svg v-if="copySucceeded" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="m5 12.5 4 4L19 6.5" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="8" y="8" width="11" height="11" />
            <path d="M16 8V5H5v11h3" />
          </svg>
        </button>
      </div>
      <span v-if="copySucceeded" class="article-code-block__copy-status" aria-live="polite">
        {{ copyLabel }}
      </span>
    </div>
    <!-- pre元素内的模板空白会成为代码文本，必须让slot与标签保持相邻。 -->
    <!-- prettier-ignore -->
    <pre :class="['article-code-block__pre', 'scrollbar-themed', props.class]" :data-language="props.language || undefined"><slot /></pre>
  </div>
</template>

<style scoped>
.article-code-block__header {
  display: flex;
  min-height: 2.2rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.45rem 0.8rem;
  color: var(--code-muted);
  border-bottom: 1px solid var(--code-line);
  background: color-mix(in srgb, var(--code-ink) 7%, var(--code-paper));
  font-family: var(--font-mono);
  font-size: 0.72rem;
}

.article-code-block__label {
  min-width: 0;
  overflow: hidden;
  color: var(--code-ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-code-block__label.is-language,
.article-code-block__language {
  color: var(--code-muted);
  text-transform: lowercase;
}

.article-code-block__actions {
  display: flex;
  flex: none;
  align-items: center;
  margin-left: auto;
}

.article-code-block__language {
  margin-right: 0.65rem;
}

.article-code-block__action-divider {
  width: 1px;
  height: 0.85rem;
  margin-right: 0.35rem;
  background: color-mix(in srgb, var(--code-ink) 35%, transparent);
}

.article-code-block__copy {
  display: grid;
  width: 1.45rem;
  height: 1.45rem;
  padding: 0;
  border: 0;
  color: var(--code-muted);
  place-items: center;
  background: transparent;
  cursor: pointer;
}

.article-code-block__copy:hover,
.article-code-block__copy:focus-visible {
  color: var(--signal);
}

.article-code-block__copy svg {
  width: 0.92rem;
  height: 0.92rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: square;
  stroke-linejoin: miter;
  stroke-width: 1.7;
}

.article-code-block__copy-status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}
</style>
