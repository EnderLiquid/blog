<script setup lang="ts">
import { formatPostDate, toDateTime } from '~/utils/date';
import { groupPostVariants, type PostVariant } from '~/utils/posts';
import type { PostSortMode } from '~/utils/post-search';

const props = defineProps<{
  posts: PostVariant[];
}>();

const { localeCode, messages } = useSiteLocale();
const { query, sortMode, hasQuery } = usePostSearchRoute();
const logicalPosts = computed(() => groupPostVariants(props.posts));
const { displayPosts, loading, searchError } = usePostSearch(
  logicalPosts,
  localeCode,
  query,
  sortMode,
);

const searchMessages = computed(() => messages.value.search);
const resultSummary = computed(() => {
  if (loading.value) {
    return searchMessages.value.loading;
  }

  if (hasQuery.value && !searchError.value) {
    return `${displayPosts.value.length} ${searchMessages.value.results}`;
  }

  return `${displayPosts.value.length} ${searchMessages.value.allPosts}`;
});

const selectedSortLabel = computed(() => sortLabels.value[sortMode.value]);
const sortOptions = computed<SortOption[]>(() => {
  const labels = sortLabels.value;

  return hasQuery.value
    ? [{ mode: 'relevance', label: labels.relevance }]
    : [
        { mode: 'latest', label: labels.latest },
        { mode: 'oldest', label: labels.oldest },
      ];
});
const sortMenuOpen = ref(false);
const sortControl = ref<HTMLElement | null>(null);
const sortTrigger = ref<HTMLButtonElement | null>(null);

interface SortOption {
  mode: PostSortMode;
  label: string;
}

const sortLabels = computed<Record<PostSortMode, string>>(() => ({
  relevance: searchMessages.value.relevance,
  latest: searchMessages.value.latest,
  oldest: searchMessages.value.oldest,
}));

function toggleSortMenu(): void {
  if (!hasQuery.value) {
    sortMenuOpen.value = !sortMenuOpen.value;
  }
}

function selectSortMode(mode: PostSortMode): void {
  sortMode.value = mode;
  sortMenuOpen.value = false;
  void nextTick(() => sortTrigger.value?.focus());
}

function closeSortMenuOnEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape' && sortMenuOpen.value) {
    event.preventDefault();
    sortMenuOpen.value = false;
    void nextTick(() => sortTrigger.value?.focus());
  }
}

function closeSortMenuOnFocusOut(event: FocusEvent): void {
  if (!(event.relatedTarget instanceof Node) || !sortControl.value?.contains(event.relatedTarget)) {
    sortMenuOpen.value = false;
  }
}

function closeSortMenuOnPointerDown(event: PointerEvent): void {
  if (
    sortMenuOpen.value &&
    event.target instanceof Node &&
    !sortControl.value?.contains(event.target)
  ) {
    sortMenuOpen.value = false;
  }
}

watch(hasQuery, (queryActive) => {
  if (queryActive) {
    sortMenuOpen.value = false;
  }
});

onMounted(() => {
  document.addEventListener('pointerdown', closeSortMenuOnPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeSortMenuOnPointerDown);
});
</script>

<template>
  <section class="post-search">
    <div class="post-search__toolbar">
      <form class="controls" role="search" @submit.prevent>
        <label class="query-control">
          <span class="visually-hidden">{{ searchMessages.label }}</span>
          <svg class="query-control__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="10.8" cy="10.8" r="5.8" />
            <path d="m15.2 15.2 4 4" />
          </svg>
          <input
            v-model="query"
            type="search"
            name="q"
            :placeholder="searchMessages.placeholder"
            autocomplete="off"
          />
        </label>
      </form>

      <div class="post-search__toolbar-meta">
        <p v-if="searchError" class="status" role="status">
          {{ searchMessages.unavailable }}
        </p>
        <p v-else class="status" aria-live="polite">
          {{ resultSummary }}
        </p>

        <div
          ref="sortControl"
          class="sort-control"
          :class="{ 'sort-control--open': sortMenuOpen }"
          @focusout="closeSortMenuOnFocusOut"
          @keydown="closeSortMenuOnEscape"
        >
          <button
            ref="sortTrigger"
            class="sort-control__trigger"
            type="button"
            aria-haspopup="menu"
            :aria-expanded="sortMenuOpen"
            :aria-label="`${searchMessages.sortLabel}: ${selectedSortLabel}`"
            :disabled="hasQuery"
            @click="toggleSortMenu"
          >
            <span>{{ selectedSortLabel }}</span>
            <span class="sort-control__arrow" aria-hidden="true" />
          </button>

          <div v-if="sortMenuOpen" class="sort-control__options" role="menu">
            <button
              v-for="option in sortOptions"
              :key="option.mode"
              class="sort-control__option"
              :class="{ 'sort-control__option--selected': option.mode === sortMode }"
              type="button"
              role="menuitemradio"
              :aria-checked="option.mode === sortMode"
              @click="selectSortMode(option.mode)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <p v-if="hasQuery && !loading && !searchError && displayPosts.length === 0" class="no-results">
      {{ searchMessages.noResults }}
    </p>

    <ul v-else class="results">
      <li v-for="item in displayPosts" :key="item.articleKeyPath">
        <article class="post-record" :lang="item.post.localeCode">
          <time class="post-record__date" :datetime="toDateTime(item.post.publishedAt)">
            {{ formatPostDate(item.post.publishedAt, localeCode) }}
          </time>

          <div class="post-record__copy">
            <h2>
              <NuxtLink :to="item.displayPath">{{ item.post.title }}</NuxtLink>
            </h2>
            <p>{{ item.post.description }}</p>
          </div>

          <footer class="post-record__tags">
            <span v-for="tag in item.post.tags ?? []" :key="tag">#{{ tag }}</span>
          </footer>
        </article>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.post-search {
  container-type: inline-size;
}

.post-search__toolbar {
  display: grid;
  grid-template-columns: minmax(14rem, 21rem) minmax(0, 1fr);
  gap: clamp(0.5rem, 1.5cqi, 1rem);
  align-items: end;
  padding-bottom: clamp(1.1rem, 2.4cqi, 1.45rem);
  border-bottom: 1px solid var(--line);
}

.controls {
  margin: 0;
}

.query-control {
  position: relative;
  display: block;
  color: var(--ink);
}

.query-control__icon {
  position: absolute;
  top: 50%;
  left: 0.75rem;
  width: 1rem;
  height: 1rem;
  pointer-events: none;
  stroke: currentColor;
  stroke-width: 1.8;
  fill: none;
  transform: translateY(-50%);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.controls input {
  width: 100%;
  min-height: 2.35rem;
  padding: 0.25rem 0.6rem 0.25rem 2.25rem;
  border: 1px solid var(--line);
  border-radius: 0;
  color: var(--ink);
  font-size: 0.95rem;
  background: var(--paper);
}

.controls input:focus-visible {
  outline: 0;
}

.query-control:hover input,
.query-control:focus-within input {
  border-color: var(--signal);
  background: color-mix(in srgb, var(--signal) 7%, transparent);
}

.query-control:hover .query-control__icon,
.query-control:focus-within .query-control__icon {
  color: var(--signal);
  transform: translate(0.12rem, -50%);
}

.sort-control {
  position: relative;
  display: block;
}

.sort-control__trigger {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  min-height: 1.65rem;
  padding: 0.2rem 0;
  border: 0;
  color: var(--ink);
  font-size: 0.95rem;
  line-height: 1.25;
  background: transparent;
  cursor: pointer;
}

.sort-control__trigger:focus-visible {
  outline: 0;
}

.sort-control__trigger:hover,
.sort-control--open .sort-control__trigger {
  color: var(--signal);
}

.sort-control__trigger:disabled {
  cursor: not-allowed;
  color: var(--muted);
  opacity: 0.55;
}

.sort-control__arrow {
  width: 0.4rem;
  height: 0.4rem;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: translateY(-0.14rem) rotate(45deg);
}

.sort-control--open .sort-control__arrow {
  transform: translateY(0.14rem) rotate(225deg);
}

.sort-control__options {
  position: absolute;
  z-index: 1;
  top: calc(100% + 0.35rem);
  right: 0;
  display: grid;
  min-width: max(100%, 6.5rem);
  border: 1px solid var(--line);
  background: var(--paper);
}

.sort-control__option {
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: 0;
  color: var(--ink);
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.35;
  text-align: center;
  background: transparent;
  cursor: pointer;
}

.sort-control__option + .sort-control__option {
  border-top: 1px solid var(--line);
}

.sort-control__option:hover,
.sort-control__option:focus-visible,
.sort-control__option--selected {
  color: var(--signal);
  background: color-mix(in srgb, var(--signal) 7%, transparent);
}

.sort-control__option:focus-visible {
  outline: 0;
}

.post-search__toolbar-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 1rem;
  align-items: center;
  justify-content: end;
}

.status {
  margin: 0;
  color: var(--muted);
  font-size: 0.98rem;
  line-height: 1.45;
  white-space: nowrap;
}

.no-results {
  margin: 2rem 0 0;
  color: var(--muted);
  font-family: var(--font-serif);
  line-height: 1.6;
}

.results {
  margin: 0;
  padding: 0;
  list-style: none;
}

.results > li + li {
  border-top: 1px solid var(--line);
}

.post-record {
  position: relative;
  display: grid;
  grid-template-areas:
    'date tags'
    'copy copy';
  grid-template-columns: max-content minmax(0, 1fr);
  column-gap: 0.65rem;
  row-gap: clamp(0.9rem, 2cqi, 1.25rem);
  padding: clamp(1.875rem, 4.25cqi, 3rem) 0;
}

.post-record__date {
  align-self: center;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.45;
  grid-area: date;
}

.post-record__copy {
  min-width: 0;
  grid-area: copy;
}

.post-record h2 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(2rem, 4.25cqi, 3.15rem);
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: -0.045em;
  text-wrap: balance;
}

.post-record h2 a {
  text-decoration: none;
}

.post-record h2 a::before {
  position: absolute;
  inset: 0;
  content: '';
}

.post-record h2 a::after {
  display: inline-block;
  margin-left: 0.45rem;
  color: var(--signal);
  content: '↗';
  opacity: 0;
  transform: translateX(-0.25rem);
}

.post-record p {
  max-width: 60rem;
  margin: 0.65rem 0 0;
  color: var(--muted);
  font-family: var(--font-serif);
  font-size: 1.08rem;
  line-height: 1.65;
}

.post-record__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.4rem;
  align-self: center;
  padding: 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.45;
  grid-area: tags;
}

.post-record__tags span {
  padding: 0.18rem 0.4rem;
  overflow-wrap: anywhere;
  background: color-mix(in srgb, var(--ink) 4%, transparent);
}

.post-record:hover {
  cursor: pointer;
}

.post-record:hover h2 a,
.post-record:focus-within h2 a {
  color: var(--signal);
}

.post-record:hover h2 a::after,
.post-record:focus-within h2 a::after {
  opacity: 1;
  transform: translateX(0);
}

@container (max-width: 42rem) {
  .post-search__toolbar {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.4rem;
    align-items: center;
  }

  .post-search__toolbar-meta {
    justify-content: space-between;
  }
}

@container (max-width: 30rem) {
  .post-search__toolbar {
    padding-bottom: 0.95rem;
  }

  .post-search__toolbar-meta {
    gap: 0.3rem;
  }

  .post-record {
    padding: 1.625rem 0;
  }

  .post-record p {
    font-size: 1rem;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .sort-control__trigger,
  .sort-control__arrow,
  .sort-control__option,
  .query-control,
  .controls input,
  .query-control__icon,
  .post-record h2 a::after {
    transition:
      color 120ms ease,
      border-color 120ms ease,
      background-color 120ms ease,
      opacity 120ms ease,
      transform 120ms ease;
  }
}
</style>
