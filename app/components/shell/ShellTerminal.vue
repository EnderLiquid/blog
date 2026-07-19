<script setup lang="ts">
import type { ShellCommandHistoryEntry, ShellTextHistoryEntry } from '~/shell/types';
import { useShellRuntime } from '~/shell/runtime-context';

const emit = defineEmits<{
  escape: [];
}>();

const { session, coordinator, commands } = useShellRuntime();
const inputElement = useTemplateRef<HTMLInputElement>('inputElement');
const historyElement = useTemplateRef<HTMLElement>('historyElement');
const promptPath = computed(() => coordinator.currentLocation.value?.virtualPath ?? '/');
const historyGroups = computed(createHistoryGroups);
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

function createHistoryGroups(): ShellHistoryGroup[] {
  const groups: ShellHistoryGroup[] = [];

  for (const entry of session.state.history) {
    if (entry.type === 'command') {
      groups.push({ command: entry, textEntries: [] });
      continue;
    }

    groups.at(-1)?.textEntries.push(entry);
  }

  return groups;
}

function focusFromPointer(): void {
  const selection = window.getSelection();

  if (selection && !selection.isCollapsed) {
    return;
  }

  focus();
}

function focus(): void {
  inputElement.value?.focus();
}

interface ShellHistoryGroup {
  command: ShellCommandHistoryEntry;
  textEntries: ShellTextHistoryEntry[];
}

defineExpose({ focus });
</script>

<template>
  <div class="terminal" @click="focusFromPointer">
    <div ref="historyElement" class="terminal__history" aria-live="polite" aria-atomic="false">
      <div v-for="group in historyGroups" :key="group.command.id" class="terminal__history-group">
        <div
          class="terminal__command"
          :class="[`is-${group.command.status}`, { 'is-route': group.command.source === 'route' }]"
        >
          <span class="terminal__prompt">visitor@blog:{{ group.command.promptPath }}$</span>
          <span class="terminal__command-body">
            <span class="terminal__command-text">{{ group.command.command }}</span>
            <span v-if="group.command.status !== 'completed'" class="terminal__status">
              {{
                group.command.status === 'pending'
                  ? '…'
                  : group.command.status === 'cancelled'
                    ? '×'
                    : '!'
              }}
            </span>
          </span>
        </div>
        <pre
          v-for="entry in group.textEntries"
          :key="entry.id"
          :class="entry.type === 'output' ? 'terminal__output' : 'terminal__error'"
          >{{ entry.content }}</pre>
      </div>
      <div v-if="historyGroups.length > 0" class="terminal__history-end" aria-hidden="true" />
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
  padding: 0 0 2rem;
  scrollbar-color: var(--line) transparent;
}

.terminal__history-group {
  background: transparent;
}

.terminal__history-group + .terminal__history-group {
  border-top: 1px solid var(--signal);
}

.terminal__command,
.terminal__input-row {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}

.terminal__command {
  flex-wrap: wrap;
  padding: 0.6rem 1rem;
  background: transparent;
}

.terminal__command-body {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex: 0 1 max-content;
  align-items: baseline;
  gap: 0.45rem;
}

.terminal__command-text {
  min-width: 0;
  flex: 1;
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

.terminal__error {
  color: var(--signal);
}

.terminal__status {
  flex: none;
  color: var(--signal);
  font-weight: 700;
}

.terminal__output,
.terminal__error {
  margin: 0;
  padding: 0.55rem 1rem;
  background: color-mix(in srgb, var(--ink) 5%, transparent);
  font: inherit;
  line-height: 1.55;
  white-space: pre-wrap;
}

.terminal__history-end {
  border-top: 1px solid var(--signal);
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
  .terminal__prompt {
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .terminal__input-row {
    flex-wrap: wrap;
  }

  .terminal__input-row .terminal__input {
    min-width: min(8rem, 100%);
    flex: 1 1 8rem;
  }
}

@media (max-width: 36rem) {
  .terminal {
    font-size: 0.9rem;
  }
}
</style>
