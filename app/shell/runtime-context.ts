import { inject, type InjectionKey } from 'vue';
import type { ShellCommandController } from '../composables/useShellCommands.ts';
import type { ShellRouteCoordinator } from '../composables/useShellRouteCoordinator.ts';
import type { ShellSessionController } from '../composables/useShellSession.ts';

export interface ShellRuntime {
  session: ShellSessionController;
  coordinator: ShellRouteCoordinator;
  commands: ShellCommandController;
}

export const SHELL_RUNTIME_KEY: InjectionKey<ShellRuntime> = Symbol('shell-runtime');

export function useShellRuntime(): ShellRuntime {
  const runtime = inject(SHELL_RUNTIME_KEY);

  if (!runtime) {
    throw new Error('Shell组件必须挂载在ShellWorkspace内部。');
  }

  return runtime;
}
