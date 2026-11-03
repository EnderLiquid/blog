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
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem clamp(1.5rem, 4cqi, 3.5rem);
  align-items: baseline;
  margin: var(--page-intro-offset) 0 clamp(2.5rem, 6cqi, 4.5rem);
}

.posts-page__header h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(3.25rem, 9cqi, 5.25rem);
  font-weight: 600;
  font-synthesis: none;
  font-optical-sizing: auto;
  line-height: 1.05;
  letter-spacing: 0;
}

.posts-page__header p {
  max-width: 32rem;
  margin: 0 0 0.2rem;
  color: var(--muted);
  font-family: var(--font-sans);
  font-size: 1.02rem;
  line-height: 1.7;
  letter-spacing: var(--tracking-body);
  text-wrap: pretty;
}
</style>
