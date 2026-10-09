import { joinURL } from 'ufo';
import { nextTick } from 'vue';
import {
  createGoatCounterArticlePath,
  GOATCOUNTER_COUNT_ENDPOINT,
} from '~~/shared/analytics/goatcounter';
import { findArticleDeliveryByPath } from '~/utils/article-delivery';

const GOATCOUNTER_SCRIPT_ID = 'goatcounter-count-script';
const GOATCOUNTER_SCRIPT_INTEGRITY =
  'sha384-atnOLvQb9t+jTSipvd75X2yginT4PjVbqDdlJAmxMm+wYElFmeR6EmLP5bYeoRVQ';

type GoatCounter = {
  count: (variables?: { path?: string; title?: string }) => void;
};

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

let goatCounterScriptPromise: Promise<GoatCounter | undefined> | undefined;

export default defineNuxtPlugin(() => {
  const router = useRouter();
  const runtimeConfig = useRuntimeConfig();
  let lastTrackedArticlePath: string | undefined;
  const pendingArticlePaths = new Set<string>();

  const trackCurrentArticle = async (routePath: string): Promise<void> => {
    const delivery = findArticleDeliveryByPath(routePath);

    if (!delivery) {
      return;
    }

    const articlePath = createGoatCounterArticlePath(delivery.articleKeyPath);

    if (lastTrackedArticlePath === articlePath || pendingArticlePaths.has(articlePath)) {
      return;
    }

    pendingArticlePaths.add(articlePath);

    try {
      const goatCounter = await loadGoatCounterScript(
        joinURL(runtimeConfig.app.baseURL, 'vendor/goatcounter/count.v5.js'),
      );

      await nextTick();

      // 快速连续导航时，放弃已经离开的页面，避免把当前标题或查询参数记到旧文章上。
      if (router.currentRoute.value.path !== routePath || !goatCounter) {
        return;
      }

      goatCounter.count({
        path: articlePath,
        title: document.title,
      });
      lastTrackedArticlePath = articlePath;
    } catch {
      // 统计属于附属能力；脚本加载失败时不打扰文章阅读。
    } finally {
      pendingArticlePaths.delete(articlePath);
    }
  };

  router.afterEach((to) => {
    void nextTick(() => trackCurrentArticle(to.path));
  });

  void router.isReady().then(() => {
    void nextTick(() => trackCurrentArticle(router.currentRoute.value.path));
  });
});

function loadGoatCounterScript(scriptUrl: string): Promise<GoatCounter | undefined> {
  if (window.goatcounter?.count) {
    return Promise.resolve(window.goatcounter);
  }

  if (goatCounterScriptPromise) {
    return goatCounterScriptPromise;
  }

  goatCounterScriptPromise = new Promise<GoatCounter | undefined>((resolve) => {
    const existingScript = document.getElementById(GOATCOUNTER_SCRIPT_ID);
    const script =
      existingScript instanceof HTMLScriptElement
        ? existingScript
        : document.createElement('script');

    const cleanup = (): void => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
    const handleLoad = (): void => {
      cleanup();
      resolve(window.goatcounter?.count ? window.goatcounter : undefined);
    };
    const handleError = (): void => {
      cleanup();
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      goatCounterScriptPromise = undefined;
      resolve(undefined);
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existingScript) {
      script.id = GOATCOUNTER_SCRIPT_ID;
      script.async = true;
      script.src = scriptUrl;
      script.integrity = GOATCOUNTER_SCRIPT_INTEGRITY;
      script.crossOrigin = 'anonymous';
      script.dataset.goatcounter = GOATCOUNTER_COUNT_ENDPOINT;
      script.dataset.goatcounterSettings = JSON.stringify({
        no_events: true,
        no_onload: true,
      });
      document.head.appendChild(script);
    }
  });

  return goatCounterScriptPromise;
}
