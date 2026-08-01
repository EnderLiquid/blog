<script setup lang="ts">
const { messages } = useSiteLocale();
const { data: posts } = await useAsyncData('all-posts', () =>
  queryCollection('posts').where('draft', '=', false).order('publishedAt', 'DESC').all(),
);
</script>

<template>
  <LayoutPageShell>
    <section class="posts-page">
      <header class="posts-page__header">
        <h1>{{ messages.posts.title }}</h1>
        <p>{{ messages.posts.description }}</p>
      </header>

      <SearchPostSearch :posts="posts ?? []" />
    </section>
  </LayoutPageShell>
</template>

<style scoped>
.posts-page {
  container-type: inline-size;
}

.posts-page__header {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(12rem, 0.9fr);
  gap: clamp(1.5rem, 6cqi, 4rem);
  align-items: end;
  margin: clamp(2rem, 6cqi, 4.5rem) 0 clamp(2.75rem, 7cqi, 4.5rem);
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}

.posts-page__header h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(3.25rem, 9cqi, 5.25rem);
  font-weight: 400;
  line-height: 0.88;
  letter-spacing: -0.065em;
}

.posts-page__header p {
  max-width: 24rem;
  margin: 0 0 0.2rem;
  color: var(--muted);
  font-family: var(--font-serif);
  font-size: 1.05rem;
  line-height: 1.55;
}

@container (max-width: 36rem) {
  .posts-page__header {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
    margin-top: 2rem;
  }

  .posts-page__header h1 {
    font-size: clamp(3rem, 16cqi, 4.25rem);
  }
}
</style>
