<script setup lang="ts">
import { ARTICLE_DELIVERY_INDEX } from '~/utils/article-delivery';
import { aboutPath, homePath, postsPath } from '~~/shared/routing/localized-routes';
import {
  createLocaleNavigationTargets,
  resolvePrimaryNavigationSection,
} from '~/utils/site-navigation';
import { useShellRuntime } from '~/shell/runtime-context';

const props = defineProps<{
  mobile: boolean;
  terminalExpanded: boolean;
}>();

const emit = defineEmits<{
  toggleTerminal: [];
}>();

const route = useRoute();
const { localeCode, messages } = useSiteLocale();
const { commands } = useShellRuntime();
const navigationElement = useTemplateRef<HTMLElement>('navigationElement');
const compactMenuButton = useTemplateRef<HTMLButtonElement>('compactMenuButton');
const languageButton = useTemplateRef<HTMLButtonElement>('languageButton');
const shellToggleButton = useTemplateRef<HTMLButtonElement>('shellToggleButton');
const languageControl = useTemplateRef<HTMLElement>('languageControl');
const compactMenuOpen = ref(false);
const languageMenuOpen = ref(false);
const hydrated = ref(false);
const navigationWidth = ref<number>();
const compactMenuId = useId();
const languageMenuId = useId();
let resizeObserver: ResizeObserver | undefined;

// 必须与组件样式中的42rem容器断点保持一致，仅用于清理已经失效的展开状态。
const COMPACT_NAVIGATION_WIDTH = 42 * 16;

const compact = computed(
  () =>
    props.mobile ||
    (navigationWidth.value !== undefined && navigationWidth.value <= COMPACT_NAVIGATION_WIDTH),
);
const activeSection = computed(() => resolvePrimaryNavigationSection(route.path));
const localeTargets = computed(() =>
  createLocaleNavigationTargets(
    hydrated.value ? route.fullPath : route.fullPath.split('#')[0]!,
    ARTICLE_DELIVERY_INDEX,
  ),
);
const shellToggleLabel = computed(() =>
  props.terminalExpanded ? commands.messages.value.close : commands.messages.value.open,
);

onMounted(() => {
  hydrated.value = true;
  resizeObserver = new ResizeObserver((entries) => {
    navigationWidth.value = entries.at(-1)?.contentRect.width;
  });

  if (navigationElement.value) {
    resizeObserver.observe(navigationElement.value);
  }

  document.addEventListener('pointerdown', handleDocumentPointerDown);
  document.addEventListener('keydown', handleDocumentKeydown);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
  document.removeEventListener('keydown', handleDocumentKeydown);
});

watch(
  () => route.fullPath,
  () => closeMenus(),
);

watch(compact, (isCompact) => {
  if (!isCompact) {
    compactMenuOpen.value = false;
  }
});

watch(
  () => props.terminalExpanded,
  () => closeMenus(),
);

watch(
  () => props.mobile,
  () => closeMenus(),
);

function toggleCompactMenu(): void {
  compactMenuOpen.value = !compactMenuOpen.value;

  if (compactMenuOpen.value) {
    languageMenuOpen.value = false;
  }
}

function toggleLanguageMenu(): void {
  languageMenuOpen.value = !languageMenuOpen.value;

  if (languageMenuOpen.value) {
    compactMenuOpen.value = false;
  }
}

function toggleTerminal(): void {
  closeMenus();
  emit('toggleTerminal');
}

function closeMenus(): void {
  compactMenuOpen.value = false;
  languageMenuOpen.value = false;
}

function handleDocumentPointerDown(event: PointerEvent): void {
  const target = event.target;

  if (!(target instanceof Node)) {
    return;
  }

  if (languageMenuOpen.value && !languageControl.value?.contains(target)) {
    languageMenuOpen.value = false;
  }

  if (compactMenuOpen.value && !navigationElement.value?.contains(target)) {
    compactMenuOpen.value = false;
  }
}

function handleDocumentKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') {
    return;
  }

  if (languageMenuOpen.value) {
    languageMenuOpen.value = false;
    void nextTick(() => languageButton.value?.focus());
    return;
  }

  if (compactMenuOpen.value) {
    compactMenuOpen.value = false;
    void nextTick(() => compactMenuButton.value?.focus());
  }
}

function focusShellToggle(): void {
  shellToggleButton.value?.focus();
}

defineExpose({ focusShellToggle });
</script>

<template>
  <nav
    ref="navigationElement"
    class="site-navigation"
    :class="{
      'is-compact-menu-open': compactMenuOpen,
      'is-language-menu-open': languageMenuOpen,
    }"
    :aria-label="messages.navigation.label"
  >
    <div class="site-navigation__bar">
      <NuxtLink class="site-navigation__brand" :to="homePath(localeCode)"> EnderLiquid </NuxtLink>

      <div
        :id="compactMenuId"
        class="site-navigation__primary-clip"
        :inert="compact && !compactMenuOpen"
        :aria-hidden="compact && !compactMenuOpen"
      >
        <div class="site-navigation__primary">
          <NuxtLink
            :to="homePath(localeCode)"
            :aria-current="activeSection === 'home' ? 'page' : undefined"
          >
            {{ messages.navigation.home }}
          </NuxtLink>
          <NuxtLink
            :to="postsPath(localeCode)"
            :aria-current="activeSection === 'posts' ? 'page' : undefined"
          >
            {{ messages.navigation.posts }}
          </NuxtLink>
          <NuxtLink
            :to="aboutPath(localeCode)"
            :aria-current="activeSection === 'about' ? 'page' : undefined"
          >
            {{ messages.navigation.about }}
          </NuxtLink>
        </div>
      </div>

      <div class="site-navigation__controls">
        <div ref="languageControl" class="language-control">
          <button
            ref="languageButton"
            class="navigation-icon-button language-control__button"
            type="button"
            :aria-label="messages.navigation.language"
            :aria-expanded="languageMenuOpen"
            :aria-controls="languageMenuId"
            @click="toggleLanguageMenu"
          >
            <svg class="language-icon" viewBox="0 0 30 20" aria-hidden="true" focusable="false">
              <text x="1" y="14">文</text>
              <text x="17" y="15">A</text>
            </svg>
          </button>

          <ul :id="languageMenuId" class="language-control__menu">
            <li v-for="target in localeTargets" :key="target.localeCode">
              <span
                v-if="target.current"
                class="language-control__current"
                :lang="target.localeCode"
                aria-current="page"
              >
                <span aria-hidden="true">✓</span>
                {{ target.label }}
              </span>
              <NuxtLink
                v-else-if="target.available && target.path"
                :to="target.path"
                :lang="target.localeCode"
              >
                <span class="language-control__check" aria-hidden="true">✓</span>
                {{ target.label }}
              </NuxtLink>
              <span
                v-else
                class="language-control__unavailable"
                :lang="target.localeCode"
                aria-disabled="true"
              >
                <span class="language-control__check" aria-hidden="true">✓</span>
                {{ target.label }}
                <span class="visually-hidden"
                  >({{ messages.navigation.translationUnavailable }})</span
                >
              </span>
            </li>
          </ul>
        </div>

        <button
          ref="shellToggleButton"
          class="navigation-icon-button site-navigation__shell-toggle"
          type="button"
          :aria-label="shellToggleLabel"
          :title="shellToggleLabel"
          :aria-expanded="terminalExpanded"
          @click="toggleTerminal"
        >
          <span aria-hidden="true">&gt;_</span>
        </button>

        <button
          ref="compactMenuButton"
          class="navigation-icon-button site-navigation__menu-toggle"
          type="button"
          :aria-label="
            compactMenuOpen ? messages.navigation.closeMenu : messages.navigation.openMenu
          "
          :aria-expanded="compactMenuOpen"
          :aria-controls="compactMenuId"
          @click="toggleCompactMenu"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path class="menu-icon__line menu-icon__line--top" d="M4 6H20" />
            <path class="menu-icon__line menu-icon__line--middle" d="M4 12H20" />
            <path class="menu-icon__line menu-icon__line--bottom" d="M4 18H20" />
          </svg>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.site-navigation {
  position: relative;
  color: var(--ink);
  border-bottom: 1px solid var(--line);
  background: var(--paper);
  container-type: inline-size;
  container-name: site-navigation;
}

.site-navigation__bar {
  position: relative;
  display: grid;
  min-height: 3.25rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 1.5rem;
  padding: 0 1rem;
}

.site-navigation__brand {
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  font-weight: 700;
  text-decoration: none;
}

.site-navigation__primary-clip {
  min-width: 0;
}

.site-navigation__primary {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.site-navigation__primary a {
  text-decoration: none;
}

.site-navigation__primary [aria-current='page'] {
  color: var(--signal);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.3rem;
}

.site-navigation__controls {
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  gap: 0.1rem;
}

.navigation-icon-button {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  place-items: center;
  color: var(--ink);
  border: 0;
  background: transparent;
  cursor: pointer;
}

.navigation-icon-button:hover {
  color: var(--signal);
}

.language-control {
  position: relative;
}

.language-icon {
  width: 1.8rem;
  height: 1.2rem;
  overflow: visible;
  fill: currentColor;
}

.language-icon text {
  font-family: Arial, 'Noto Sans SC', sans-serif;
  font-size: 14px;
  font-weight: 700;
}

.language-control__menu {
  position: absolute;
  z-index: 42;
  top: calc(100% + 0.25rem);
  right: 0;
  display: none;
  width: max-content;
  min-width: 10rem;
  margin: 0;
  padding: 0.35rem 0;
  border: 1px solid var(--line);
  background: var(--paper);
  list-style: none;
}

.is-language-menu-open .language-control__menu {
  display: block;
}

.language-control__menu a,
.language-control__menu > li > span {
  display: grid;
  grid-template-columns: 1rem 1fr;
  gap: 0.5rem;
  padding: 0.55rem 0.8rem;
  text-decoration: none;
}

.language-control__menu a:hover,
.language-control__menu a:focus-visible {
  color: var(--signal);
  background: color-mix(in srgb, var(--ink) 5%, transparent);
}

.language-control__current {
  color: var(--signal);
}

.language-control__check {
  visibility: hidden;
}

.language-control__unavailable {
  color: var(--muted);
  cursor: not-allowed;
}

.site-navigation__shell-toggle {
  position: absolute;
  top: 0.25rem;
  left: -2.75rem;
  z-index: 2;
  color: var(--signal);
  font-weight: 700;
  transform: translateX(calc(0px - var(--shell-separator)));
}

.site-navigation__menu-toggle {
  display: none;
}

.site-navigation__menu-toggle svg {
  width: 1.35rem;
  height: 1.35rem;
  overflow: visible;
  fill: none;
  stroke: currentColor;
  stroke-linecap: square;
  stroke-width: 1.8;
}

.menu-icon__line {
  transform-box: fill-box;
  transform-origin: center;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@container site-navigation (max-width: 42rem) {
  .site-navigation__bar {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0;
  }

  .site-navigation__primary-clip {
    display: grid;
    min-width: 0;
    grid-column: 1 / -1;
    grid-row: 2;
    grid-template-rows: 0fr;
  }

  .site-navigation__primary {
    min-height: 0;
    visibility: hidden;
    align-items: flex-start;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
  }

  .is-compact-menu-open .site-navigation__primary {
    visibility: visible;
  }

  .site-navigation__primary a {
    width: 100%;
    padding: 0.65rem 0 0.65rem 0.65rem;
    border-top: 1px dotted var(--line);
  }

  .is-compact-menu-open .site-navigation__primary-clip {
    grid-template-rows: 1fr;
  }

  .site-navigation__controls {
    grid-column: 2;
    grid-row: 1;
  }

  .site-navigation__menu-toggle {
    display: grid;
  }

  .is-compact-menu-open .menu-icon__line--top {
    transform: translateY(6px) rotate(45deg);
  }

  .is-compact-menu-open .menu-icon__line--middle {
    opacity: 0;
  }

  .is-compact-menu-open .menu-icon__line--bottom {
    transform: translateY(-6px) rotate(-45deg);
  }
}

@media (max-width: 36rem) {
  .site-navigation__bar {
    padding-right: calc(
      max(0.3rem, env(safe-area-inset-right)) + var(--mobile-scrollbar-compensation, 0px)
    );
    padding-left: max(0.8rem, env(safe-area-inset-left));
  }

  .site-navigation__controls {
    gap: 0;
  }

  .site-navigation__shell-toggle {
    position: static;
    z-index: auto;
    color: var(--signal);
    transform: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .site-navigation__primary-clip,
  .menu-icon__line {
    transition:
      grid-template-rows 140ms ease,
      transform 140ms ease,
      opacity 100ms ease;
  }

  .site-navigation__shell-toggle {
    transition: transform 140ms ease;
  }
}

@media (scripting: none) {
  .language-control__button,
  .site-navigation__shell-toggle,
  .site-navigation__menu-toggle {
    display: none !important;
  }

  .language-control__menu {
    position: static;
    display: flex;
    width: auto;
    min-width: 0;
    padding: 0;
    border: 0;
  }

  .language-control__menu a,
  .language-control__menu > li > span {
    display: inline-block;
    padding: 0.5rem;
  }

  .site-navigation__primary-clip {
    grid-template-rows: 1fr !important;
  }

  .site-navigation__primary {
    visibility: visible !important;
  }
}
</style>
