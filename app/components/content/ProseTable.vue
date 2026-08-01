<template>
  <div class="article-table-scroll scrollbar-themed">
    <table>
      <slot />
    </table>
  </div>
</template>

<style scoped>
.article-table-scroll {
  max-width: 100%;
  overflow-x: auto;
}
</style>
