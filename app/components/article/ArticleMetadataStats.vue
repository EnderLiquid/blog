<script setup lang="ts">
import { createGoatCounterArticleCountUrl } from '~~/shared/analytics/goatcounter';

type ViewCountState = 'loading' | 'loaded' | 'unavailable';

const VIEW_COUNT_TIMEOUT_MS = 3000;

const props = defineProps<{
  articleKeyPath: string;
}>();

const { messages } = useSiteLocale();
const viewCountState = ref<ViewCountState>('loading');
const viewCount = ref('');

let requestId = 0;
let activeController: AbortController | undefined;
let activeTimeout: number | undefined;

watch(
  () => props.articleKeyPath,
  (articleKeyPath) => {
    void loadViewCount(articleKeyPath);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  requestId += 1;
  cancelActiveRequest();
});

async function loadViewCount(articleKeyPath: string): Promise<void> {
  const currentRequestId = ++requestId;
  cancelActiveRequest();
  viewCountState.value = 'loading';
  viewCount.value = '';

  if (!import.meta.client) {
    return;
  }

  const controller = new AbortController();
  activeController = controller;
  activeTimeout = window.setTimeout(() => controller.abort(), VIEW_COUNT_TIMEOUT_MS);

  try {
    const response = await fetch(createGoatCounterArticleCountUrl(articleKeyPath), {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (response.status === 404) {
      // GoatCounter对尚未产生访问的路径返回404，但正文中的计数语义仍然是0。
      if (currentRequestId === requestId) {
        viewCount.value = '0';
        viewCountState.value = 'loaded';
      }
      return;
    }

    if (!response.ok) {
      throw new Error(`GoatCounter returned ${response.status}`);
    }

    const payload: unknown = await response.json();

    if (!isViewCountPayload(payload)) {
      throw new Error('GoatCounter returned an invalid count');
    }

    if (currentRequestId !== requestId) {
      return;
    }

    viewCount.value = payload.count;
    viewCountState.value = 'loaded';
  } catch {
    if (currentRequestId === requestId) {
      viewCountState.value = 'unavailable';
    }
  } finally {
    if (currentRequestId === requestId) {
      cancelActiveRequest();
    }
  }
}

function cancelActiveRequest(): void {
  activeController?.abort();
  activeController = undefined;

  if (activeTimeout !== undefined) {
    window.clearTimeout(activeTimeout);
    activeTimeout = undefined;
  }
}

function isViewCountPayload(value: unknown): value is { count: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'count' in value &&
    typeof value.count === 'string' &&
    value.count.trim().length > 0
  );
}
</script>

<template>
  <p class="article-header__stats" data-pagefind-ignore>
    <span class="article-header__stat">
      <span>{{ messages.article.readingTime }}</span>
      <span class="article-header__stat-value">—</span>
    </span>

    <span
      v-if="viewCountState !== 'unavailable'"
      class="article-header__separator"
      aria-hidden="true"
    >
      ·
    </span>

    <span v-if="viewCountState !== 'unavailable'" class="article-header__stat">
      <span>{{ messages.article.views }}</span>
      <span class="article-header__stat-value" aria-atomic="true" aria-live="polite">
        {{ viewCountState === 'loading' ? '…' : viewCount }}
      </span>
    </span>
  </p>
</template>

<style scoped>
.article-header__stats {
  display: flex;
  flex: 0 0 100%;
  flex-wrap: wrap;
  gap: 0.6em;
  min-width: 0;
  margin: 0;
  padding-top: clamp(0.65rem, 1.5cqi, 0.85rem);
  border-top: 1px solid color-mix(in srgb, var(--line) 65%, transparent);
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.article-header__stat {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 0.45em;
  min-width: 0;
  white-space: nowrap;
}

.article-header__stat-value {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.article-header__separator {
  color: var(--line);
}
</style>
