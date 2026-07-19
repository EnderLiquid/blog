<script setup lang="ts">
import { provide } from 'vue';
import { SHELL_RUNTIME_KEY } from '~/shell/runtime-context';

const session = useShellSession();
const coordinator = useShellRouteCoordinator(session);
const commands = useShellCommands(session, coordinator);
const workspaceElement = useTemplateRef<HTMLElement>('workspace');
const panel = useTemplateRef<{ focusTerminal: () => void }>('panel');
const navigation = useTemplateRef<{ focusShellToggle: () => void }>('navigation');
const isMobile = ref(false);
const mobileScrollbarCompensation = ref(0);
let mobileMediaQuery: MediaQueryList | undefined;
let workspaceResizeObserver: ResizeObserver | undefined;

provide(SHELL_RUNTIME_KEY, {
  session,
  coordinator,
  commands,
});

const shellEnabled = computed(() => Boolean(coordinator.currentLocation.value));
const collapsed = computed(() => session.state.panelMode === 'collapsed');
const terminalExpanded = computed(() =>
  isMobile.value ? session.state.mobilePane === 'shell' : !collapsed.value,
);
const panelHidden = computed(() =>
  isMobile.value ? session.state.mobilePane !== 'shell' : collapsed.value,
);
const workspaceStyle = computed(() => ({
  '--shell-column': collapsed.value ? '2.75rem' : `${session.state.panelWidth}px`,
  '--shell-separator': collapsed.value ? '0px' : '0.35rem',
  '--mobile-scrollbar-compensation': `${mobileScrollbarCompensation.value}px`,
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
  const enteringMobile = event.matches && !isMobile.value;
  const leavingMobile = !event.matches && isMobile.value;

  if (enteringMobile) {
    mobileScrollbarCompensation.value = collapsed.value ? 0 : measureRootScrollbarWidth();
    session.state.mobilePane = collapsed.value ? 'page' : 'shell';
  } else if (leavingMobile) {
    session.state.panelMode = session.state.mobilePane === 'shell' ? 'open' : 'collapsed';
    mobileScrollbarCompensation.value = 0;
  }

  isMobile.value = event.matches;

  if (!event.matches) {
    void nextTick(() => clampPanelWidth(workspaceElement.value?.clientWidth));
  }
}

function toggleShell(): void {
  if (terminalExpanded.value) {
    closeShell();
  } else {
    openShell();
  }
}

function openShell(): void {
  if (isMobile.value) {
    // 页面使用根滚动条，终端使用内部滚动条。切换前保留根滚动条占宽，
    // 避免导航右侧按钮随滚动条消失而横向跳动。
    mobileScrollbarCompensation.value = measureRootScrollbarWidth();
    session.state.mobilePane = 'shell';
  } else {
    session.state.panelMode = 'open';
  }

  void nextTick(() => panel.value?.focusTerminal());
}

function closeShell(): void {
  if (isMobile.value) {
    mobileScrollbarCompensation.value = 0;
    session.state.mobilePane = 'page';
  } else {
    session.state.panelMode = 'collapsed';
  }

  void nextTick(() => navigation.value?.focusShellToggle());
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

function measureRootScrollbarWidth(): number {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
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
  <div
    v-if="shellEnabled"
    ref="workspace"
    class="shell-workspace"
    :class="{ 'is-mobile-shell-active': isMobile && terminalExpanded }"
    :style="workspaceStyle"
  >
    <aside
      class="shell-workspace__panel"
      :class="{ 'is-panel-hidden': panelHidden }"
      :inert="panelHidden"
      :aria-hidden="panelHidden"
    >
      <ShellPanel ref="panel" @close="closeShell" />
    </aside>

    <ShellResizeHandle
      v-if="!collapsed"
      class="shell-workspace__separator"
      :width="session.state.panelWidth"
      @resize="resizeShell"
    />

    <NavigationSiteNavigation
      ref="navigation"
      class="shell-workspace__navigation"
      :mobile="isMobile"
      :terminal-expanded="terminalExpanded"
      @toggle-terminal="toggleShell"
    />

    <div
      class="shell-workspace__page"
      :class="{ 'is-hidden-mobile': isMobile && session.state.mobilePane !== 'page' }"
      :inert="isMobile && session.state.mobilePane !== 'page'"
      :aria-hidden="isMobile && session.state.mobilePane !== 'page'"
    >
      <slot />
    </div>
  </div>

  <slot v-else />
</template>

<style scoped>
.shell-workspace {
  display: grid;
  min-height: 100dvh;
  grid-template-columns: var(--shell-column) var(--shell-separator) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  align-items: start;
}

.shell-workspace__panel {
  position: sticky;
  z-index: 20;
  top: 0;
  min-width: 0;
  height: 100dvh;
  grid-column: 1;
  grid-row: 1 / 3;
  overflow: hidden;
  border-right: 1px solid var(--signal);
  background: var(--paper);
}

.shell-workspace__panel.is-panel-hidden > * {
  visibility: hidden;
}

.shell-workspace__separator {
  position: sticky;
  z-index: 21;
  top: 0;
  height: 100dvh;
  grid-column: 2;
  grid-row: 1 / 3;
}

.shell-workspace__navigation {
  position: sticky;
  z-index: 30;
  top: 0;
  grid-column: 3;
  grid-row: 1;
}

.shell-workspace__page {
  min-width: 0;
  min-height: calc(100dvh - 3.25rem);
  grid-column: 3;
  grid-row: 2;
}

@media (max-width: 36rem) {
  .shell-workspace {
    display: grid;
    min-height: 100dvh;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .shell-workspace.is-mobile-shell-active {
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
  }

  .shell-workspace__navigation {
    grid-column: 1;
    grid-row: 1;
  }

  .shell-workspace__panel,
  .shell-workspace__page {
    position: static;
    width: 100%;
    min-height: 0;
    grid-column: 1;
    grid-row: 2;
    border: 0;
  }

  .shell-workspace__panel {
    height: 100%;
  }

  .shell-workspace__page {
    min-height: calc(100dvh - 3.25rem);
  }

  .is-hidden-mobile,
  .shell-workspace__panel.is-panel-hidden {
    display: none;
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
  .shell-workspace__separator {
    display: none !important;
  }

  .shell-workspace__navigation,
  .shell-workspace__page {
    display: block !important;
  }
}
</style>
