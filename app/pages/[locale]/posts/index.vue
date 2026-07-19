<script setup lang="ts">
const { messages } = useSiteLocale();
const { data: posts } = await useAsyncData('all-posts', () =>
  queryCollection('posts').where('draft', '=', false).order('publishedAt', 'DESC').all(),
);
</script>

<template>
  <LayoutPageShell>
    <header class="page-header">
      <h1>{{ messages.posts.title }}</h1>
      <p>{{ messages.posts.description }}</p>
    </header>

    <SearchPostSearch :posts="posts ?? []" />
  </LayoutPageShell>
</template>

<style scoped>
.page-header {
  margin: 4rem 0;
}

.page-header h1 {
  margin: 0.25rem 0 1rem;
  font-family: var(--font-serif);
  font-size: clamp(2.8rem, 8vw, 5.5rem);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.06em;
}

.page-header p {
  color: var(--muted);
  font-size: 1.1rem;
}
</style>
