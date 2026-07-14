<script setup lang="ts">
defineProps<{
  statusCode: number;
}>();

defineEmits<{
  home: [];
  posts: [];
}>();

const { messages } = useSiteLocale();
</script>

<template>
  <LayoutPageShell>
    <section class="error-page">
      <p class="status-code">{{ statusCode }}</p>
      <h1>{{ messages.notFound.title }}</h1>
      <p>{{ messages.notFound.description }}</p>
      <div class="actions">
        <button type="button" @click="$emit('home')">
          {{ messages.notFound.home }}
        </button>
        <button type="button" @click="$emit('posts')">
          {{ messages.notFound.posts }}
        </button>
      </div>
    </section>
  </LayoutPageShell>
</template>

<style scoped>
.error-page {
  max-width: 36rem;
}

.status-code {
  color: var(--signal);
}

h1 {
  margin: 0.5rem 0 1rem;
  font-family: var(--font-serif);
  font-size: clamp(2.8rem, 8vw, 5.5rem);
  font-weight: 400;
}

.actions {
  display: flex;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

button {
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--signal);
  background: transparent;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  cursor: pointer;
}
</style>
