<script setup lang="ts">
import { PROFILE_LINKS } from '~~/shared/site-definitions/profile';

const { messages } = useSiteLocale();
const identityElement = useTemplateRef<HTMLElement>('identityElement');
const quoteElement = useTemplateRef<HTMLElement>('quoteElement');
const contentRowOffset = ref(0);
let alignmentObserver: ResizeObserver | undefined;

const layoutStyle = computed(() => ({
  '--content-row-offset': `${contentRowOffset.value}px`,
}));

onMounted(() => {
  alignmentObserver = new ResizeObserver(updateContentRowOffset);

  if (identityElement.value) {
    alignmentObserver.observe(identityElement.value);
  }

  if (quoteElement.value) {
    alignmentObserver.observe(quoteElement.value);
  }

  updateContentRowOffset();
});

onUnmounted(() => alignmentObserver?.disconnect());

/**
 * 身份比引句高时，Grid第二行会被身份撑开；第三行需要抵消这段额外高度，
 * 才能让右侧引句与正文维持稳定间距，同时保留两列各自的底部对齐。
 */
function updateContentRowOffset(): void {
  const identityHeight = identityElement.value?.getBoundingClientRect().height ?? 0;
  const quoteHeight = quoteElement.value?.getBoundingClientRect().height ?? 0;
  contentRowOffset.value = Math.max(0, identityHeight - quoteHeight);
}
</script>

<template>
  <LayoutPageShell>
    <article class="about-page">
      <div class="about-layout" :style="layoutStyle">
        <header class="about-heading">
          <h1>{{ messages.about.title }}</h1>
          <p>{{ messages.about.name }}</p>
        </header>

        <p ref="identityElement" class="about-identity">
          <template v-for="(line, index) in messages.about.identity" :key="line">
            <span>{{ line }}</span>
            <br v-if="index < messages.about.identity.length - 1" />
          </template>
        </p>

        <blockquote ref="quoteElement" class="about-quote">
          <p>
            <template v-for="(line, index) in messages.about.quote" :key="line">
              <span>{{ line }}</span>
              <br v-if="index < messages.about.quote.length - 1" />
            </template>
          </p>
        </blockquote>

        <div class="about-prose">
          <p>{{ messages.about.reflection }}</p>
          <p>{{ messages.about.java }}</p>
        </div>

        <nav class="about-links" :aria-label="messages.about.linksLabel">
          <a
            class="profile-link"
            :href="PROFILE_LINKS.github.url"
            target="_blank"
            rel="me noopener noreferrer"
          >
            <IconsGitHubIcon class="profile-link__icon" />
            <span class="profile-link__platform">{{ messages.about.github }}</span>
            <span class="profile-link__arrow" aria-hidden="true">↗</span>
            <span class="profile-link__identity">{{ PROFILE_LINKS.github.identity }}</span>
          </a>

          <a
            class="profile-link"
            :href="PROFILE_LINKS.bilibili.url"
            target="_blank"
            rel="me noopener noreferrer"
          >
            <IconsBilibiliIcon class="profile-link__icon" />
            <span class="profile-link__platform">{{ messages.about.bilibili }}</span>
            <span class="profile-link__arrow" aria-hidden="true">↗</span>
            <span class="profile-link__identity">{{ PROFILE_LINKS.bilibili.identity }}</span>
          </a>
        </nav>
      </div>
    </article>
  </LayoutPageShell>
</template>

<style scoped>
.about-page {
  container-type: inline-size;
  container-name: about-page;
}

.about-layout {
  display: grid;
  min-height: min(42rem, calc(100svh - 9rem));
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--line);
  grid-template-areas:
    'heading heading'
    'identity quote'
    'links prose';
  align-content: start;
  grid-template-columns: minmax(9rem, 0.34fr) minmax(0, 1fr);
  grid-template-rows: auto auto auto;
  column-gap: clamp(2rem, 7cqi, 4.75rem);
  row-gap: clamp(3.75rem, 8cqi, 5rem);
}

.about-heading {
  grid-area: heading;
}

.about-heading h1,
.about-heading p,
.about-identity {
  margin: 0;
}

.about-heading h1 {
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.3;
}

.about-heading p {
  margin-top: 0.3rem;
  color: var(--signal);
  font-size: clamp(1.1rem, 3cqi, 1.35rem);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.about-identity {
  align-self: end;
  max-width: 14rem;
  font-size: 1rem;
  grid-area: identity;
  line-height: 1.75;
}

.about-quote {
  align-self: start;
  margin: 0;
  font-family: var(--font-serif);
  grid-area: quote;
}

.about-quote p {
  margin: 0;
  font-size: clamp(2.15rem, 6.4cqi, 3.35rem);
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: -0.045em;
  text-wrap: balance;
}

.about-quote p::first-letter {
  color: var(--signal);
}

.about-prose {
  align-self: end;
  font-family: var(--font-serif);
  font-size: clamp(1.02rem, 2.5cqi, 1.14rem);
  grid-area: prose;
  line-height: 1.9;
}

.about-prose p {
  margin: 0;
}

.about-prose p + p {
  margin-top: 1.5rem;
}

.about-links {
  display: grid;
  align-self: end;
  gap: 0.7rem;
  grid-area: links;
}

.about-prose,
.about-links {
  transform: translateY(calc(0px - var(--content-row-offset)));
}

.profile-link {
  display: grid;
  min-width: 0;
  padding: 0.75rem;
  color: var(--ink);
  border: 1px solid var(--line);
  background: transparent;
  grid-template-columns: 1.35rem minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  column-gap: 0.6rem;
  text-decoration: none;
}

.profile-link__icon {
  grid-column: 1;
  grid-row: 1 / -1;
}

.profile-link__platform {
  min-width: 0;
  grid-column: 2;
  grid-row: 1;
  font-size: 0.92rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.profile-link__arrow {
  grid-column: 3;
  grid-row: 1;
}

.profile-link__identity {
  min-width: 0;
  margin-top: 0.2rem;
  color: var(--muted);
  font-size: 0.74rem;
  grid-column: 2 / -1;
  grid-row: 2;
  overflow-wrap: anywhere;
}

.profile-link:hover,
.profile-link:focus-visible {
  color: var(--signal);
  border-color: var(--signal);
  background: color-mix(in srgb, var(--signal) 7%, transparent);
}

.profile-link:hover .profile-link__identity,
.profile-link:focus-visible .profile-link__identity {
  color: currentColor;
}

@container about-page (max-width: 38rem) {
  .about-layout {
    min-height: 0;
    grid-template-areas:
      'heading'
      'identity'
      'quote'
      'prose'
      'links';
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: repeat(5, auto);
    row-gap: 3rem;
  }

  .about-identity,
  .about-prose,
  .about-links {
    align-self: start;
  }

  .about-prose,
  .about-links {
    transform: none;
  }

  .about-identity {
    max-width: 28rem;
  }

  .about-quote p {
    font-size: clamp(2rem, 9cqi, 3.15rem);
  }

  .about-links {
    width: min(100%, 22rem);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .profile-link,
  .profile-link__arrow {
    transition:
      color 120ms ease,
      border-color 120ms ease,
      background-color 120ms ease,
      transform 120ms ease;
  }

  .profile-link:hover .profile-link__arrow,
  .profile-link:focus-visible .profile-link__arrow {
    transform: translate(0.12rem, -0.12rem);
  }
}
</style>
