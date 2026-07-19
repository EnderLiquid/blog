<script setup lang="ts">
import { useShellRuntime } from '~/shell/runtime-context';

const props = defineProps<{
  collapsed: boolean;
  mobile: boolean;
}>();

const emit = defineEmits<{
  open: [];
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
  <button
    v-if="collapsed && !mobile"
    class="shell-rail-button"
    type="button"
    :aria-label="commands.messages.value.open"
    :title="commands.messages.value.open"
    @click="emit('open')"
  >
    <span aria-hidden="true">&gt;_</span>
  </button>

  <section v-else class="shell-panel" :aria-label="commands.messages.value.terminal">
    <header class="shell-panel__header">
      <p>visitor@blog:~</p>
      <button type="button" @click="emit('close')">
        {{ mobile ? commands.messages.value.returnToPage : commands.messages.value.close }}
      </button>
    </header>

    <ShellTerminal ref="terminal" @escape="emit('close')" />
  </section>
</template>

<style scoped>
.shell-rail-button {
  display: grid;
  width: 100%;
  height: 100%;
  padding: 0;
  place-items: start center;
  color: var(--signal);
  border: 0;
  background: transparent;
  cursor: pointer;
}

.shell-rail-button span {
  margin-top: 1.15rem;
  font-weight: 700;
  writing-mode: vertical-rl;
}

.shell-panel {
  display: flex;
  min-width: 0;
  height: 100dvh;
  flex-direction: column;
  color: var(--ink);
  background: var(--paper);
  container-type: inline-size;
}

.shell-panel__header {
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--line);
}

.shell-panel__header p {
  margin: 0;
  color: var(--muted);
  font-size: 0.8rem;
}

.shell-panel__header button {
  padding: 0.2rem 0;
  color: var(--signal);
  border: 0;
  border-bottom: 1px solid currentColor;
  background: transparent;
  cursor: pointer;
}
</style>
