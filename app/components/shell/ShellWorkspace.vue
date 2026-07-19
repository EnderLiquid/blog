<script setup lang="ts">
import { provide } from 'vue';
import { SHELL_RUNTIME_KEY } from '~/shell/runtime-context';

const session = useShellSession();
const coordinator = useShellRouteCoordinator(session);
const commands = useShellCommands(session, coordinator);
const workspaceElement = useTemplateRef<HTMLElement>('workspace');
const panel = useTemplateRef<{ focusTerminal: () => void }>('panel');
const pageOpenButton = useTemplateRef<HTMLButtonElement>('pageOpenButton');
const isMobile = ref(false);
let mobileMediaQuery: MediaQueryList | undefined;
let workspaceResizeObserver: ResizeObserver | undefined;

provide(SHELL_RUNTIME_KEY, {
  session,
  coordinator,
  commands,
});

const shellEnabled = computed(() => Boolean(coordinator.currentLocation.value));
const collapsed = computed(() => session.state.panelMode === 'collapsed');
const workspaceStyle = computed(() => ({
  '--shell-column': collapsed.value ? '2.75rem' : `${session.state.panelWidth}px`,
  '--shell-separator': collapsed.value ? '0px' : '0.35rem',
}));

onMounted(() => {
  mobileMediaQuery = window.matchMedia('(max-width: 36rem)');
  updateMobileMode(mobileMediaQuery);
  mobileMediaQuery.addEventListener('change', updateMobileMode);

  workspaceResizeObserver = new ResizeObserver((entries) => {
    const availableWidth = entries.at(-1)?.contentRect.width;

    if (availableWidth !== undefined) {
      clampPanelWidth(availableWidth);
    }
  });

  if (workspaceElement.value) {
    workspaceResizeObserver.observe(workspaceElement.value);
  }
});

onUnmounted(() => {
  mobileMediaQuery?.removeEventListener('change', updateMobileMode);
  workspaceResizeObserver?.disconnect();
});

watch(workspaceElement, (element, previousElement) => {
  if (!workspaceResizeObserver) {
    return;
  }

  if (previousElement) {
    workspaceResizeObserver.unobserve(previousElement);
  }

  if (element) {
    workspaceResizeObserver.observe(element);
  }
});

function updateMobileMode(event: MediaQueryList | MediaQueryListEvent): void {
  isMobile.value = event.matches;

  if (!event.matches) {
    void nextTick(() => clampPanelWidth(workspaceElement.value?.clientWidth));
  }
}

function openShell(): void {
  if (isMobile.value) {
    session.state.mobilePane = 'shell';
  } else {
    session.state.panelMode = 'open';
  }

  void nextTick(() => panel.value?.focusTerminal());
}

function closeShell(): void {
  if (isMobile.value) {
    session.state.mobilePane = 'page';
    void nextTick(() => pageOpenButton.value?.focus());
  } else {
    session.state.panelMode = 'collapsed';
  }
}

function resizeShell(width: number): void {
  const availableWidth = workspaceElement.value?.clientWidth ?? window.innerWidth;
  session.state.panelWidth = constrainedPanelWidth(width, availableWidth);
}

function clampPanelWidth(availableWidth = workspaceElement.value?.clientWidth): void {
  if (availableWidth === undefined || mobileMediaQuery?.matches) {
    return;
  }

  session.state.panelWidth = constrainedPanelWidth(session.state.panelWidth, availableWidth);
}

function constrainedPanelWidth(width: number, availableWidth: number): number {
  const minimumWidth = 256;
  const pageMinimumWidth = 320;
  const separatorWidth = 6;
  const maximumWidth = Math.max(
    minimumWidth,
    Math.min(availableWidth * 0.45, availableWidth - pageMinimumWidth - separatorWidth),
  );

  return Math.min(maximumWidth, Math.max(minimumWidth, width));
}
</script>

<template>
  <div v-if="shellEnabled" ref="workspace" class="shell-workspace" :style="workspaceStyle">
    <aside
      class="shell-workspace__panel"
      :class="{ 'is-hidden-mobile': isMobile && session.state.mobilePane !== 'shell' }"
      :inert="isMobile && session.state.mobilePane !== 'shell'"
      :aria-hidden="isMobile && session.state.mobilePane !== 'shell'"
    >
      <ShellPanel
        ref="panel"
        :collapsed="collapsed"
        :mobile="isMobile"
        @open="openShell"
        @close="closeShell"
      />
    </aside>

    <ShellResizeHandle
      v-if="!collapsed"
      class="shell-workspace__separator"
      :width="session.state.panelWidth"
      @resize="resizeShell"
    />

    <div
      class="shell-workspace__page"
      :class="{ 'is-hidden-mobile': isMobile && session.state.mobilePane !== 'page' }"
      :inert="isMobile && session.state.mobilePane !== 'page'"
      :aria-hidden="isMobile && session.state.mobilePane !== 'page'"
    >
      <slot />
    </div>

    <button
      v-if="isMobile && session.state.mobilePane === 'page'"
      ref="pageOpenButton"
      class="shell-workspace__mobile-open"
      type="button"
      @click="openShell"
    >
      <span aria-hidden="true">&gt;_</span>
      <span class="shell-workspace__mobile-label">{{ commands.messages.value.open }}</span>
    </button>
  </div>

  <slot v-else />
</template>

<style scoped>
.shell-workspace {
  display: grid;
  min-height: 100dvh;
  grid-template-columns: var(--shell-column) var(--shell-separator) minmax(0, 1fr);
  align-items: start;
}

.shell-workspace__panel {
  position: sticky;
  z-index: 20;
  top: 0;
  min-width: 0;
  height: 100dvh;
  border-right: 1px solid var(--signal);
  background: var(--paper);
}

.shell-workspace__separator {
  position: sticky;
  z-index: 21;
  top: 0;
  height: 100dvh;
}

.shell-workspace__page {
  min-width: 0;
  min-height: 100dvh;
  grid-column: 3;
}

.shell-workspace__mobile-open {
  display: none;
}

@media (max-width: 36rem) {
  .shell-workspace {
    display: block;
  }

  .shell-workspace__panel,
  .shell-workspace__page {
    position: static;
    width: 100%;
    min-height: 100dvh;
    border: 0;
  }

  .shell-workspace__panel {
    height: 100dvh;
  }

  .is-hidden-mobile {
    display: none;
  }

  .shell-workspace__mobile-open {
    position: fixed;
    z-index: 30;
    right: 0.8rem;
    bottom: max(0.8rem, env(safe-area-inset-bottom));
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    color: var(--paper);
    border: 1px solid var(--signal);
    border-radius: 0;
    background: var(--signal);
    cursor: pointer;
  }

  .shell-workspace__mobile-label {
    font-size: 0.75rem;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .shell-workspace {
    transition: grid-template-columns 140ms ease;
  }
}

@media (scripting: none) {
  .shell-workspace {
    display: block !important;
  }

  .shell-workspace__panel,
  .shell-workspace__separator,
  .shell-workspace__mobile-open {
    display: none !important;
  }

  .shell-workspace__page {
    display: block !important;
  }
}
</style>
