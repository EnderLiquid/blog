<script setup lang="ts">
const props = defineProps<{
  width: number;
}>();

const emit = defineEmits<{
  resize: [width: number];
}>();

const isDragging = ref(false);
let startX = 0;
let startWidth = 0;

function startResize(event: PointerEvent): void {
  if (event.pointerType === 'keyboard') {
    return;
  }

  isDragging.value = true;
  startX = event.clientX;
  startWidth = props.width;
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', stopResize, { once: true });
}

function handlePointerMove(event: PointerEvent): void {
  if (!isDragging.value) {
    return;
  }

  emit('resize', startWidth + event.clientX - startX);
}

function stopResize(): void {
  isDragging.value = false;
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', stopResize);
}

onUnmounted(stopResize);
</script>

<template>
  <div
    class="shell-resize-handle"
    :class="{ 'is-dragging': isDragging }"
    role="separator"
    aria-orientation="vertical"
    aria-label="调整终端宽度"
    @pointerdown.prevent="startResize"
  />
</template>

<style scoped>
.shell-resize-handle {
  position: relative;
  width: 0.35rem;
  cursor: col-resize;
  background: transparent;
  touch-action: none;
}

.shell-resize-handle::before {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 3rem;
  content: '';
  background: color-mix(in srgb, var(--signal) 45%, transparent);
  transform: translate(-50%, -50%);
  transition: background-color 120ms ease;
}

.shell-resize-handle:hover::before,
.shell-resize-handle.is-dragging::before {
  background: var(--signal);
}

@media (max-width: 36rem) {
  .shell-resize-handle {
    display: none;
  }
}
</style>
