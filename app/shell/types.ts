import type { LocaleCode } from '../../shared/i18n/locales.ts';

export type ShellCommandStatus = 'pending' | 'completed' | 'cancelled' | 'failed';

export interface ShellCommandHistoryEntry {
  id: number;
  type: 'command';
  source: 'user' | 'route';
  command: string;
  promptPath: string;
  status: ShellCommandStatus;
}

export interface ShellTextHistoryEntry {
  id: number;
  type: 'output' | 'error';
  content: string;
}

export type ShellHistoryEntry = ShellCommandHistoryEntry | ShellTextHistoryEntry;

export interface ShellSessionState {
  history: ShellHistoryEntry[];
  inputDraft: string;
  commandCursor?: number;
  panelMode: 'collapsed' | 'open';
  panelWidth: number;
  mobilePane: 'page' | 'shell';
}

export interface ShellLocation {
  localeCode: LocaleCode;
  virtualPath: string;
  search: string;
  hash: string;
  fullPath: string;
}

export interface PendingNavigationIntent {
  id: number;
  commandHistoryEntryId: number;
  targetFullPath: string;
}

export type NavigationIntentTransition =
  | {
      id: number;
      status: 'completed';
    }
  | {
      id: number;
      status: 'cancelled';
      reason: 'superseded-by-later-intent' | 'superseded-by-route';
    };
