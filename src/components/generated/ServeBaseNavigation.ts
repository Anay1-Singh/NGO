import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

const sceneSelector = "#sx-main, #db-main, #vp-main, .sb-auth, .sv-auth";
const navigationEvent = "servebase:navigate";
type NavigationRequest = { hash: string; onCommit?: () => void };

function pagePath(hash: string) {
  return hash.replace(/^#/, "").split("?")[0].replace(/\/$/, "") || "/";
}

/** Keep session changes and their destination in the same visual update. */
export function navigateServeBase(hash: string, onCommit?: () => void) {
  const request = new CustomEvent<NavigationRequest>(navigationEvent, {
    detail: { hash: hash.startsWith("#") ? hash : `#${hash}`, onCommit },
    cancelable: true,
  });
  if (window.dispatchEvent(request)) {
    onCommit?.();
    window.location.hash = hash;
  }
}

/** One transition owner for links, programmatic navigation, and browser history. */
export function useServeBaseRoute() {
  const [route, setRoute] = useState(() => window.location.hash);
  const routeRef = useRef(route);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let transition: ViewTransition | null = null;
    let entrance: Animation | null = null;
    let revision = 0;
    const html = document.documentElement;

    function clearMotion(token: number) {
      if (token !== revision) return;
      delete html.dataset.sbTransitioning;
      transition = null;
      entrance = null;
    }

    function update(next: string, onCommit?: () => void, pushHistory = false) {
      if (next === routeRef.current && !onCommit && !transition && !entrance) return;
      const animate = pagePath(next) !== pagePath(routeRef.current);
      const token = ++revision;
      transition?.skipTransition();
      entrance?.cancel();
      const commit = () => {
        if (token !== revision) return;
        if (pushHistory && window.location.hash !== next)
          history.pushState(null, "", next);
        routeRef.current = next;
        flushSync(() => {
          onCommit?.();
          setRoute(next);
        });
      };

      if (!animate || reduced.matches || document.hidden) {
        delete html.dataset.sbTransitioning;
        commit();
        return;
      }

      html.dataset.sbTransitioning = "true";
      if (typeof document.startViewTransition === "function") {
        transition = document.startViewTransition(commit);
        // A rapid next navigation may intentionally skip the previous snapshot.
        void transition.ready.catch(() => {});
        void transition.finished.catch(() => {}).then(() => clearMotion(token));
      } else {
        commit();
        const scene = document.querySelector<HTMLElement>(sceneSelector);
        if (scene && typeof scene.animate === "function") {
          entrance = scene.animate(
            [{ opacity: 0.35, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
            { duration: 240, easing: "cubic-bezier(.16,1,.3,1)" },
          );
          void entrance.finished.catch(() => {}).then(() => clearMotion(token));
        } else clearMotion(token);
      }
    }

    const onHashChange = () => update(window.location.hash);
    const onRequest = (event: Event) => {
      const request = event as CustomEvent<NavigationRequest>;
      if (!request.detail?.hash) return;
      event.preventDefault();
      update(request.detail.hash, request.detail.onCommit, true);
    };
    const onPreferenceChange = () => {
      if (!reduced.matches) return;
      transition?.skipTransition();
      entrance?.cancel();
      delete html.dataset.sbTransitioning;
    };
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener(navigationEvent, onRequest);
    reduced.addEventListener("change", onPreferenceChange);
    return () => {
      revision++;
      transition?.skipTransition();
      entrance?.cancel();
      delete html.dataset.sbTransitioning;
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener(navigationEvent, onRequest);
      reduced.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return route;
}
