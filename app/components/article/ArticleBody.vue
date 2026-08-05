<script setup lang="ts">
import type { Collections } from '@nuxt/content';
import { localizeFootnotes } from '~~/shared/content/footnotes';

const props = defineProps<{
  value: Collections['posts'];
}>();

const { messages } = useSiteLocale();
const renderedValue = computed(() => ({
  ...props.value,
  body: localizeFootnotes(props.value.body, messages.value.article),
}));
</script>

<template>
  <ContentRenderer
    class="article-body"
    :value="renderedValue"
    :components="{ img: 'ArticleImage', 'article-image': 'ArticleImage' }"
  />
</template>

<style scoped>
.article-body {
  font-family: var(--font-serif);
  font-size: 1.08rem;
  line-height: 1.85;
  overflow-wrap: anywhere;
}

.article-body :deep(h1),
.article-body :deep(h2),
.article-body :deep(h3),
.article-body :deep(h4),
.article-body :deep(h5),
.article-body :deep(h6) {
  margin: 3.4rem 0 1rem;
  color: var(--ink);
  font-family: var(--font-serif);
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
  scroll-margin-top: 5rem;
}

.article-body :deep(h1) {
  font-size: clamp(2rem, 5vw, 3rem);
}

.article-body :deep(h2) {
  padding-bottom: 0.45rem;
  border-bottom: 1px solid var(--signal);
  font-size: clamp(1.75rem, 4.2vw, 2.45rem);
}

.article-body :deep(h3) {
  color: var(--signal);
  font-size: clamp(1.45rem, 3.5vw, 2rem);
}

.article-body :deep(h4) {
  margin: 2.4rem 0 0.65rem;
  font-size: clamp(1.2rem, 2.75vw, 1.45rem);
  font-weight: 700;
  line-height: 1.35;
}

.article-body :deep(h5) {
  margin: 2rem 0 0.55rem;
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.45;
  letter-spacing: 0.02em;
}

.article-body :deep(h6) {
  margin: 1.65rem 0 0.45rem;
  padding-left: 0.65rem;
  color: var(--muted);
  border-left: 1px solid color-mix(in srgb, var(--signal) 50%, var(--line));
  font-family: var(--font-mono);
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.04em;
}

.article-body :deep(h1:first-child),
.article-body :deep(h2:first-child),
.article-body :deep(h3:first-child),
.article-body :deep(h4:first-child),
.article-body :deep(h5:first-child),
.article-body :deep(h6:first-child) {
  margin-top: 0;
}

.article-body :deep(p) {
  margin: 0 0 1.35rem;
}

.article-body :deep(p:last-child) {
  margin-bottom: 0;
}

.article-body :deep(.katex) {
  color: var(--ink);
}

.article-body :deep(.katex-display) {
  max-width: 100%;
  margin: 2rem 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.2rem 0;
}

.article-body :deep(.katex-display > .katex) {
  min-width: max-content;
}

.article-body :deep(a) {
  color: var(--signal);
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.2em;
}

.article-body :deep(a:hover),
.article-body :deep(a:focus-visible) {
  color: var(--ink);
}

.article-body :deep(strong) {
  font-weight: 700;
}

.article-body :deep(del) {
  color: var(--muted);
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: 0 0 1.5rem;
  padding-left: 1.5em;
}

.article-body :deep(li) {
  padding-left: 0.25rem;
}

.article-body :deep(li + li) {
  margin-top: 0.35rem;
}

.article-body :deep(li > ul),
.article-body :deep(li > ol) {
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
}

.article-body :deep(.contains-task-list) {
  padding-left: 0;
  list-style: none;
}

.article-body :deep(.task-list-item) {
  display: grid;
  grid-template-columns: 1rem minmax(0, 1fr);
  align-items: start;
  gap: 0.55rem;
  padding-left: 0;
}

.article-body :deep(.task-list-item input[type='checkbox']) {
  display: grid;
  width: 0.95rem;
  height: 0.95rem;
  margin: 0.43em 0 0;
  appearance: none;
  border: 1px solid var(--line);
  color: var(--paper);
  opacity: 1;
  place-content: center;
  -webkit-appearance: none;
  background: var(--paper);
  pointer-events: none;
}

.article-body :deep(.task-list-item input[type='checkbox']:checked) {
  border-color: var(--signal);
  background: var(--signal);
}

.article-body :deep(.task-list-item input[type='checkbox']:checked::after) {
  width: 0.25rem;
  height: 0.5rem;
  border: solid currentColor;
  border-width: 0 2px 2px 0;
  content: '';
  transform: translateY(-0.06rem) rotate(45deg);
}

.article-body :deep(.task-list-item input[type='checkbox']:disabled) {
  cursor: default;
}

.article-body :deep(.article-footnotes) {
  margin-top: 3.5rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--line);
}

.article-body :deep(.article-footnotes__title) {
  margin: 0;
  padding: 0;
  color: var(--signal);
  border: 0;
  font-family: var(--font-serif);
  font-size: clamp(1.2rem, 2.75cqi, 1.45rem);
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: normal;
}

.article-body :deep(.article-footnotes ol) {
  margin: 1rem 0 0;
  padding-left: 1.45em;
  font-size: 0.92em;
  line-height: 1.75;
}

.article-body :deep(.article-footnotes__item) {
  padding-left: 0.2em;
  scroll-margin-top: 5rem;
}

.article-body :deep(.article-footnotes__item + .article-footnotes__item) {
  margin-top: 0.7rem;
}

.article-body :deep(.article-footnotes p) {
  margin-bottom: 0.65rem;
}

.article-body :deep(.article-footnotes__reference) {
  color: var(--signal);
  font-family: var(--font-mono);
  font-weight: 700;
  text-decoration: none;
  scroll-margin-top: 5rem;
}

.article-body :deep(.article-footnotes__backref) {
  display: inline-grid;
  margin-left: 0.4em;
  color: var(--signal);
  font-family: var(--font-mono);
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
}

.article-body :deep(.article-footnotes__reference:hover),
.article-body :deep(.article-footnotes__backref:hover) {
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.article-body :deep(.article-footnotes__reference:focus-visible),
.article-body :deep(.article-footnotes__backref:focus-visible) {
  outline: 1px solid var(--signal);
  outline-offset: 0.15rem;
}

.article-body :deep(blockquote) {
  margin: 2rem 0;
  padding: 0.15rem 1.25rem;
  color: var(--muted);
  border-left: 2px solid var(--signal);
  background: color-mix(in srgb, var(--ink) 4%, transparent);
}

.article-body :deep(blockquote > :last-child) {
  margin-bottom: 0;
}

.article-body :deep(hr) {
  margin: 3rem 0;
  border: 0;
  border-top: 1px solid var(--line);
}

.article-body :deep(code) {
  padding: 0.08em 0.3em;
  color: var(--signal);
  border: 1px solid color-mix(in srgb, var(--signal) 28%, var(--line));
  background: color-mix(in srgb, var(--signal) 7%, transparent);
  font-family: var(--font-mono);
  font-size: 0.82em;
  overflow-wrap: anywhere;
}

.article-body :deep(pre code) {
  padding: 0;
  color: inherit;
  border: 0;
  background: transparent;
  font: inherit;
  overflow-wrap: normal;
}

.article-body :deep(.article-code-block) {
  margin: 2rem 0;
  overflow: hidden;
  color: var(--code-ink);
  border: 1px solid var(--code-line);
  background: var(--code-paper);
}

.article-body :deep(.article-code-block__pre) {
  max-width: 100%;
  margin: 0;
  overflow-x: auto;
  padding: 1.15rem 1.25rem;
  color: var(--code-ink);
  background: var(--code-paper);
  font-family: var(--font-mono);
  font-size: 0.86em;
  line-height: 1.65;
  tab-size: 2;
}

.article-body :deep(.article-code-block__pre code) {
  display: block;
  width: max-content;
  min-width: 100%;
  font: inherit;
}

.article-body :deep(.article-code-block__pre .line) {
  display: block;
  min-height: 1.65em;
}

.article-body :deep(.article-code-block__pre .line.highlight) {
  margin: 0 -1.25rem;
  padding: 0 1.25rem;
  background: color-mix(in srgb, var(--signal) 16%, var(--code-paper));
  box-shadow: inset 2px 0 var(--signal);
}

.article-body :deep(.article-code-block__pre ::selection) {
  color: var(--code-paper);
  background: var(--signal);
}

.article-body :deep(.article-table-scroll) {
  max-width: 100%;
  margin: 2rem 0;
  overflow-x: auto;
  border: 1px solid var(--line);
}

.article-body :deep(table) {
  width: 100%;
  min-width: 32rem;
  border-collapse: collapse;
  font-size: 0.92em;
}

.article-body :deep(th),
.article-body :deep(td) {
  padding: 0.65rem 0.8rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--line);
}

.article-body :deep(th) {
  color: var(--ink);
  background: color-mix(in srgb, var(--ink) 5%, transparent);
  font-family: var(--font-mono);
  font-size: 0.82em;
  font-weight: 700;
}

.article-body :deep(tr:last-child td) {
  border-bottom: 0;
}

.article-body :deep(.article-image) {
  max-inline-size: 100%;
}

.article-body :deep(.article-image--block) {
  display: block;
  inline-size: var(--article-image-width, 100%);
  max-inline-size: 100%;
  margin-block: 2rem;
  margin-inline: auto;
}

.article-body :deep(.article-image--block[data-align='start']) {
  margin-inline: 0 auto;
}

.article-body :deep(.article-image--block[data-align='end']) {
  margin-inline: auto 0;
}

.article-body :deep(.article-image--block .article-image__media) {
  display: block;
  inline-size: 100%;
  max-inline-size: 100%;
  border: 1px solid var(--line);
}

.article-body :deep(.article-image--block .article-image__media:hover),
.article-body :deep(.article-image--block .article-image__media:focus-visible) {
  border-color: var(--signal);
}

.article-body :deep(.article-image__picture) {
  display: block;
}

.article-body :deep(.article-image img) {
  display: block;
  max-inline-size: 100%;
  block-size: auto;
}

.article-body :deep(.article-image--block img) {
  inline-size: 100%;
}

.article-body :deep(.article-image--inline) {
  display: inline-block;
  inline-size: var(--article-image-width, auto);
  max-inline-size: 100%;
  vertical-align: var(--article-image-vertical-align, baseline);
}

.article-body :deep(.article-image--inline .article-image__media) {
  display: block;
  max-inline-size: 100%;
}

.article-body :deep(.article-image--inline .article-image__media:focus-visible) {
  outline: 1px solid var(--signal);
  outline-offset: 0.12em;
}

.article-body :deep(.article-image--inline img) {
  inline-size: 100%;
}

.article-body :deep(.article-image--inline:not(.article-image--has-width) img) {
  inline-size: auto;
}

.article-body :deep(figure) {
  margin: 2rem 0;
}

.article-body :deep(figure .article-image--block) {
  margin: 0;
}

.article-body :deep(figcaption) {
  margin-top: 0.6rem;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.8em;
  text-align: center;
}

.article-body :deep(kbd) {
  padding: 0.1em 0.35em;
  color: var(--ink);
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--ink) 5%, transparent);
  font-family: var(--font-mono);
  font-size: 0.78em;
}

.article-body :deep(mark) {
  padding: 0.05em 0.15em;
  color: var(--ink);
  background: color-mix(in srgb, var(--signal) 25%, var(--paper));
}

.article-body :deep(sub),
.article-body :deep(sup) {
  line-height: 0;
}

@media (max-width: 36rem) {
  .article-body {
    font-size: 1rem;
    line-height: 1.8;
  }

  .article-body :deep(h1),
  .article-body :deep(h2),
  .article-body :deep(h3),
  .article-body :deep(h4),
  .article-body :deep(h5),
  .article-body :deep(h6) {
    scroll-margin-top: 4rem;
  }

  .article-body :deep(.article-footnotes__item),
  .article-body :deep(.article-footnotes__reference) {
    scroll-margin-top: 4rem;
  }

  .article-body :deep(blockquote) {
    margin-right: 0;
    margin-left: 0;
    padding-right: 1rem;
    padding-left: 1rem;
  }

  .article-body :deep(.article-code-block__pre) {
    padding-right: 1rem;
    padding-left: 1rem;
    font-size: 0.8em;
  }

  .article-body :deep(.article-code-block__pre .line.highlight) {
    margin-right: -1rem;
    margin-left: -1rem;
    padding-right: 1rem;
    padding-left: 1rem;
  }

  .article-body :deep(table) {
    min-width: 28rem;
  }
}
</style>
