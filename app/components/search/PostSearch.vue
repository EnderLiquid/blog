<script setup lang="ts">
import { formatPostDate, toDateTime } from '~/utils/date';
import { groupPostVariants, type PostVariant } from '~/utils/posts';

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
</script>

<template>
  <section class="post-search">
    <div class="post-search__toolbar">
      <form class="controls" role="search" @submit.prevent>
        <label class="query-control">
          <span>{{ searchMessages.label }}</span>
          <input
            v-model="query"
            type="search"
            name="q"
            :placeholder="searchMessages.placeholder"
            autocomplete="off"
          />
        </label>

        <label>
          <span>{{ searchMessages.sortLabel }}</span>
          <select v-model="sortMode" name="sort" :disabled="hasQuery">
            <option v-if="hasQuery" value="relevance">{{ searchMessages.relevance }}</option>
            <option value="latest">{{ searchMessages.latest }}</option>
            <option value="oldest">{{ searchMessages.oldest }}</option>
          </select>
        </label>
      </form>

      <p v-if="searchError" class="status" role="status">
        {{ searchMessages.unavailable }}
      </p>
      <p v-else class="status" aria-live="polite">
        {{ resultSummary }}
      </p>
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
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1.5rem;
  align-items: end;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid var(--signal);
}

.controls {
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) 8.5rem;
  gap: 1rem;
  align-items: end;
}

.controls label {
  display: grid;
  gap: 0.35rem;
}

.controls label > span {
  color: var(--muted);
  font-size: 0.76rem;
}

.controls input,
.controls select {
  width: 100%;
  min-height: 2.25rem;
  padding: 0.35rem 0;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  color: var(--ink);
  background: transparent;
}

.controls input:focus-visible,
.controls select:focus-visible {
  border-bottom-color: var(--signal);
}

.controls select:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.status {
  margin: 0 0 0.35rem;
  color: var(--muted);
  font-size: 0.8rem;
  text-align: right;
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
  border-bottom: 1px solid var(--line);
  list-style: none;
}

.results > li {
  border-top: 1px solid var(--line);
}

.post-record {
  display: grid;
  grid-template-areas: 'date copy tags';
  grid-template-columns: minmax(6rem, 7.5rem) minmax(0, 1fr) minmax(5.5rem, 7.5rem);
  gap: clamp(1rem, 3cqi, 2rem);
  padding: clamp(1.4rem, 3.5cqi, 2rem) 0;
}

.post-record__date {
  align-self: start;
  padding-top: 0.3rem;
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
  font-size: clamp(1.55rem, 4cqi, 2.15rem);
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.post-record h2 a {
  text-decoration: none;
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
  max-width: 36rem;
  margin: 0.7rem 0 0;
  color: var(--muted);
  font-family: var(--font-serif);
  line-height: 1.55;
}

.post-record__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.65rem;
  align-content: start;
  padding-top: 0.35rem;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.45;
  grid-area: tags;
}

.post-record__tags span {
  overflow-wrap: anywhere;
}

.post-record h2 a:hover,
.post-record h2 a:focus-visible {
  color: var(--signal);
}

.post-record h2 a:hover::after,
.post-record h2 a:focus-visible::after {
  opacity: 1;
  transform: translateX(0);
}

@container (max-width: 42rem) {
  .post-search__toolbar {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.75rem;
  }

  .status {
    margin: 0;
    text-align: left;
  }

  .post-record {
    grid-template-areas:
      'date copy'
      '. tags';
    grid-template-columns: minmax(5.5rem, 6.5rem) minmax(0, 1fr);
    row-gap: 0.75rem;
  }

  .post-record__tags {
    padding-top: 0;
  }
}

@container (max-width: 30rem) {
  .controls {
    grid-template-columns: minmax(0, 1fr);
  }

  .post-record {
    grid-template-areas:
      'date'
      'copy'
      'tags';
    grid-template-columns: minmax(0, 1fr);
    gap: 0.7rem;
  }

  .post-record__date {
    padding-top: 0;
  }

  .post-record h2 {
    font-size: clamp(1.65rem, 8.5cqi, 2.15rem);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .post-record h2 a::after {
    transition:
      opacity 120ms ease,
      transform 120ms ease;
  }
}
</style>
