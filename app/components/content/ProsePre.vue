<script setup lang="ts">
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
</script>

<template>
  <div class="article-code-block">
    <div v-if="props.filename || props.language" class="article-code-block__header">
      <span v-if="props.filename" class="article-code-block__filename">
        {{ props.filename }}
      </span>
      <span v-if="props.language" class="article-code-block__language">
        {{ props.language }}
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

.article-code-block__filename {
  min-width: 0;
  overflow: hidden;
  color: var(--code-ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-code-block__language {
  flex: none;
  color: var(--code-muted);
  text-transform: lowercase;
}
</style>
