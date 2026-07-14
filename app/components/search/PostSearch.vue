<script setup lang="ts">
import { formatPostDate, toDateTime } from '~/utils/date';
import { groupPostVariants, type PostVariant } from '~/utils/posts';

const props = defineProps<{
  posts: PostVariant[];
}>();

const { localeKey, messages } = useSiteLocale();
const { query, sortMode, hasQuery } = usePostSearchRoute();
const logicalPosts = computed(() => groupPostVariants(props.posts));
const { displayPosts, loading, searchError } = usePostSearch(
  logicalPosts,
  localeKey,
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

    <p v-if="hasQuery && !loading && !searchError && displayPosts.length === 0">
      {{ searchMessages.noResults }}
    </p>

    <ul v-else class="results">
      <li v-for="item in displayPosts" :key="item.articleKeyPath">
        <article :lang="item.post.locale">
          <h2>
            <NuxtLink :to="item.post.path">{{ item.post.title }}</NuxtLink>
          </h2>
          <p>{{ item.post.description }}</p>
          <footer>
            <time :datetime="toDateTime(item.post.publishedAt)">
              {{ formatPostDate(item.post.publishedAt, item.post.locale) }}
            </time>
            <span v-for="tag in item.post.tags ?? []" :key="tag">#{{ tag }}</span>
          </footer>
        </article>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.controls {
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) auto;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1rem;
}

.controls label > span {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--muted);
  font-size: 0.8rem;
}

.controls input,
.controls select {
  width: 100%;
  min-height: 2.6rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 0;
  color: var(--ink);
  background: transparent;
}

.controls select:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.status {
  min-height: 1.5rem;
  color: var(--muted);
}

.results {
  margin: 0;
  padding: 0;
  list-style: none;
}

.results > li {
  padding: 1.5rem 0;
  border-top: 1px dotted var(--line);
}

.results h2 {
  margin: 0 0 0.65rem;
  font-family: var(--font-serif);
  font-size: 1.65rem;
  font-weight: 400;
}

.results p {
  margin: 0 0 0.75rem;
  line-height: 1.6;
}

.results footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  color: var(--muted);
  font-size: 0.8rem;
}

@media (max-width: 36rem) {
  .controls {
    grid-template-columns: 1fr;
  }
}
</style>
