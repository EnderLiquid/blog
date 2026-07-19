import type {
  ShellCommandHistoryEntry,
  ShellCommandStatus,
  ShellHistoryEntry,
  ShellSessionState,
} from '~/shell/types';

const DEFAULT_PANEL_WIDTH = 320;

/** 创建仅在当前SPA Document中存活的Shell会话。 */
export function useShellSession() {
  const state = reactive<ShellSessionState>({
    history: [],
    inputDraft: '',
    commandCursor: undefined,
    panelMode: 'collapsed',
    panelWidth: DEFAULT_PANEL_WIDTH,
    mobilePane: 'page',
  });
  let nextHistoryEntryId = 1;

  function appendCommand(
    command: string,
    source: ShellCommandHistoryEntry['source'],
    status: ShellCommandStatus,
    promptPath: string,
  ): ShellCommandHistoryEntry {
    const entry: ShellCommandHistoryEntry = {
      id: nextHistoryEntryId,
      type: 'command',
      source,
      command,
      promptPath,
      status,
    };
    nextHistoryEntryId += 1;
    state.history.push(entry);
    return entry;
  }

  function appendOutput(content: string): void {
    appendTextEntry('output', content);
  }

  function appendError(content: string): void {
    appendTextEntry('error', content);
  }

  function updateCommandStatus(entryId: number, status: ShellCommandStatus): void {
    const entry = state.history.find(
      (candidate): candidate is ShellCommandHistoryEntry =>
        candidate.type === 'command' && candidate.id === entryId,
    );

    if (!entry || entry.status !== 'pending') {
      return;
    }

    entry.status = status;
  }

  function clearHistory(): void {
    state.history.splice(0);
    state.commandCursor = undefined;
  }

  function userCommandHistory(): string[] {
    return state.history
      .filter(
        (entry): entry is ShellCommandHistoryEntry =>
          entry.type === 'command' && entry.source === 'user',
      )
      .map((entry) => entry.command);
  }

  function appendTextEntry(type: 'output' | 'error', content: string): void {
    const entry: ShellHistoryEntry = {
      id: nextHistoryEntryId,
      type,
      content,
    };
    nextHistoryEntryId += 1;
    state.history.push(entry);
  }

  return {
    state,
    appendCommand,
    appendOutput,
    appendError,
    updateCommandStatus,
    clearHistory,
    userCommandHistory,
  };
}

export type ShellSessionController = ReturnType<typeof useShellSession>;
