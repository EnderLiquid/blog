<template>
  <div class="article-table-scroll">
    <table>
      <slot />
    </table>
  </div>
</template>

<style scoped>
.article-table-scroll {
  max-width: 100%;
  overflow-x: auto;
  scrollbar-color: var(--line) transparent;
}
</style>
