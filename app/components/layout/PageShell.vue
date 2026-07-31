<script setup lang="ts">
withDefaults(
  defineProps<{
    narrow?: boolean;
    wide?: boolean;
  }>(),
  {
    narrow: false,
    wide: false,
  },
);
</script>

<template>
  <main class="page-shell" :class="{ 'page-shell--narrow': narrow, 'page-shell--wide': wide }">
    <slot />
  </main>
</template>

<style scoped>
.page-shell {
  width: min(48rem, calc(100% - 3rem));
  margin: 0 auto;
  padding: 12vh 0 5rem;
}

.page-shell--narrow {
  width: min(44rem, calc(100% - 3rem));
}

.page-shell--wide {
  width: min(68rem, calc(100% - 3rem));
}

@media (max-width: 36rem) {
  .page-shell,
  .page-shell--narrow,
  .page-shell--wide {
    width: min(100% - 2rem, 48rem);
    padding-top: 4rem;
  }
}
</style>
