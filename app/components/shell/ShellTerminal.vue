<script setup lang="ts">
import { useShellRuntime } from '~/shell/runtime-context';

const emit = defineEmits<{
  escape: [];
}>();

const { session, coordinator, commands } = useShellRuntime();
const inputElement = useTemplateRef<HTMLInputElement>('inputElement');
const historyElement = useTemplateRef<HTMLElement>('historyElement');
const promptPath = computed(() => coordinator.currentLocation.value?.virtualPath ?? '/');
let draftBeforeHistory = '';

watch(
  () => session.state.history.length,
  () => {
    void nextTick(() => {
      if (historyElement.value) {
        historyElement.value.scrollTop = historyElement.value.scrollHeight;
      }
    });
  },
);

function submit(): void {
  const input = session.state.inputDraft;
  session.state.inputDraft = '';
  session.state.commandCursor = undefined;
  draftBeforeHistory = '';
  commands.execute(input);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.isComposing) {
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    submit();
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveHistoryCursor(-1);
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveHistoryCursor(1);
    return;
  }

  if (event.key.toLowerCase() === 'l' && event.ctrlKey) {
    event.preventDefault();
    session.clearHistory();
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    emit('escape');
  }
}

function moveHistoryCursor(direction: -1 | 1): void {
  const history = session.userCommandHistory();

  if (history.length === 0) {
    return;
  }

  if (session.state.commandCursor === undefined) {
    if (direction > 0) {
      return;
    }

    draftBeforeHistory = session.state.inputDraft;
    session.state.commandCursor = history.length - 1;
  } else {
    const nextCursor = session.state.commandCursor + direction;

    if (nextCursor >= history.length) {
      session.state.commandCursor = undefined;
      session.state.inputDraft = draftBeforeHistory;
      return;
    }

    session.state.commandCursor = Math.max(0, nextCursor);
  }

  session.state.inputDraft = history[session.state.commandCursor] ?? '';
}

function focus(): void {
  inputElement.value?.focus();
}

defineExpose({ focus });
</script>

<template>
  <div class="terminal" @click="focus">
    <div ref="historyElement" class="terminal__history" aria-live="polite" aria-atomic="false">
      <template v-for="entry in session.state.history" :key="entry.id">
        <div
          v-if="entry.type === 'command'"
          class="terminal__command"
          :class="[`is-${entry.status}`, { 'is-route': entry.source === 'route' }]"
        >
          <span class="terminal__prompt">visitor@blog:{{ entry.promptPath }}$</span>
          <span class="terminal__command-text">{{ entry.command }}</span>
          <span v-if="entry.status !== 'completed'" class="terminal__status">
            {{ entry.status === 'pending' ? '…' : entry.status === 'cancelled' ? '×' : '!' }}
          </span>
        </div>
        <pre v-else-if="entry.type === 'output'" class="terminal__output">{{ entry.content }}</pre>
        <pre v-else class="terminal__error">{{ entry.content }}</pre>
      </template>
    </div>

    <label class="terminal__input-row">
      <span class="terminal__prompt">visitor@blog:{{ promptPath }}$</span>
      <span class="sr-only">{{ commands.messages.value.inputLabel }}</span>
      <input
        ref="inputElement"
        v-model="session.state.inputDraft"
        class="terminal__input"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        @keydown="handleKeydown"
      />
    </label>
  </div>
</template>

<style scoped>
.terminal {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  cursor: text;
}

.terminal__history {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 1rem 1rem 2rem;
  scrollbar-color: var(--line) transparent;
}

.terminal__command,
.terminal__input-row {
  display: grid;
  grid-template-columns: max-content minmax(2rem, 1fr) auto;
  align-items: baseline;
  gap: 0.6rem;
}

.terminal__command + .terminal__command,
.terminal__output + .terminal__command,
.terminal__error + .terminal__command {
  margin-top: 0.45rem;
}

.terminal__prompt {
  color: var(--signal);
  white-space: nowrap;
}

.terminal__command-text,
.terminal__output,
.terminal__error {
  overflow-wrap: anywhere;
}

.terminal__command.is-route {
  color: var(--muted);
}

.terminal__command.is-cancelled {
  color: var(--muted);
  text-decoration: line-through;
  text-decoration-thickness: 0.06em;
}

.terminal__command.is-failed,
.terminal__error {
  color: var(--signal);
}

.terminal__status {
  color: var(--signal);
  font-weight: 700;
}

.terminal__output,
.terminal__error {
  margin: 0.55rem 0 0;
  font: inherit;
  line-height: 1.55;
  white-space: pre-wrap;
}

.terminal__input-row {
  padding: 0.8rem 1rem 1rem;
  border-top: 1px solid var(--line);
}

.terminal__input {
  min-width: 0;
  padding: 0;
  color: var(--ink);
  border: 0;
  outline: 0;
  background: transparent;
  caret-color: var(--signal);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@container (max-width: 28rem) {
  .terminal__command,
  .terminal__input-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .terminal__prompt {
    grid-column: 1 / -1;
    overflow-wrap: anywhere;
    white-space: normal;
  }
}

@media (max-width: 36rem) {
  .terminal {
    font-size: 0.9rem;
  }
}
</style>
