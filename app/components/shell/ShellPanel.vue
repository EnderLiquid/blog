<script setup lang="ts">
import { useShellRuntime } from '~/shell/runtime-context';

const emit = defineEmits<{
  close: [];
}>();

const { commands } = useShellRuntime();
const terminal = useTemplateRef<{ focus: () => void }>('terminal');

function focusTerminal(): void {
  terminal.value?.focus();
}

defineExpose({ focusTerminal });
</script>

<template>
  <section class="shell-panel" :aria-label="commands.messages.value.terminal">
    <header class="shell-panel__header">
      <p>visitor@blog:~</p>
    </header>

    <ShellTerminal ref="terminal" @escape="emit('close')" />
  </section>
</template>

<style scoped>
.shell-panel {
  display: flex;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  color: var(--ink);
  background: var(--paper);
  container-type: inline-size;
}

.shell-panel__header {
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  padding: 0.7rem 3.25rem 0.7rem 1rem;
  border-bottom: 1px solid var(--line);
}

.shell-panel__header p {
  margin: 0;
  overflow: hidden;
  color: var(--muted);
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 36rem) {
  .shell-panel__header {
    display: none;
  }
}
</style>
