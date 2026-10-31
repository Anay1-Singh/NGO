import { useEffect } from "react";
import type { RefObject } from "react";

const navigationKeys = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

const scrollRequestEvent = "servebase:scroll-request";
const instant = "instant" as ScrollBehavior;
const wheelResponseMs = 54;
const settleDistance = 0.75;

function maximumScroll() {
  const documentScroller = document.scrollingElement;
  return Math.max(
    0,
    (documentScroller?.scrollHeight ?? 0) - document.documentElement.clientHeight,
  );
}

/** An explicit section/top action uses the same interruptible motion owner. */
export function smoothScrollTo(top: number) {
  if (!Number.isFinite(top)) return;
  const request = new CustomEvent<{ top: number }>(scrollRequestEvent, {
    detail: { top },
    cancelable: true,
  });
  // Keep the helper useful outside MotionSurface as well.
  if (window.dispatchEvent(request))
    window.scrollTo({
      top,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? instant
        : "smooth",
    });
}

export function smoothScrollToElement(element: Element | null, offset = 0) {
  if (!element) return;
  smoothScrollTo(window.scrollY + element.getBoundingClientRect().top - offset);
}

/**
 * Take the hard edge off a discrete mouse-wheel notch. Precision scrolling,
 * touch, keyboard navigation and browser-driven scrolling remain native.
 */
export function useSmoothWheel(
  rootRef: RefObject<HTMLElement | null>,
  sceneKey?: string,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let target = window.scrollY;
    let expected = window.scrollY;
    // Retain subpixel integration even when a browser rounds scrollY to whole
    // CSS pixels. Reading that rounded value back into each frame would leave
    // a small, permanent tail on high-refresh displays.
    let position = window.scrollY;
    let previousTime = 0;
    let direction = 0;
    let precisionUntil = 0;
    let jump: { from: number; start: number; duration: number } | null = null;

    const isPageLocked = () =>
      document.body.style.overflow === "hidden" ||
      document.body.style.overflowY === "hidden" ||
      document.documentElement.style.overflow === "hidden" ||
      document.documentElement.style.overflowY === "hidden" ||
      Boolean(document.querySelector("dialog[open], [aria-modal='true']"));

    const cancel = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      target = expected = position = window.scrollY;
      previousTime = 0;
      direction = 0;
      jump = null;
    };

    const step = (time: number) => {
      frame = 0;
      const current = window.scrollY;
      if (isPageLocked()) {
        cancel();
        return;
      }
      // A hash jump, focus move, native smooth scroll or another scroll owner
      // takes precedence over this short wheel animation.
      if (Math.abs(current - expected) > 1.5) {
        cancel();
        return;
      }
      // Use elapsed time instead of a per-frame interpolation percentage, so a
      // 120/144 Hz display has the same response as a 60 Hz display. A suspended
      // tab settles immediately rather than playing a stale wheel gesture.
      const elapsed = previousTime ? Math.max(0, time - previousTime) : 16.67;
      previousTime = time;
      target = Math.min(maximumScroll(), Math.max(0, target));
      const distance = target - position;
      let next: number;
      if (jump) {
        const progress = Math.min(1, (time - jump.start) / jump.duration);
        // Section actions respond on the first frame, then gently decelerate.
        // An ease-in would create a perceptible pause after the click.
        const eased = 1 - (1 - progress) ** 4;
        next = jump.from + (target - jump.from) * eased;
      } else {
        next =
          Math.abs(distance) <= settleDistance || elapsed > 100
            ? target
            : position + distance * (1 - Math.exp(-elapsed / wheelResponseMs));
      }
      window.scrollTo({ top: next, behavior: instant });
      position = next;
      expected = window.scrollY;
      // The document may become shorter while React changes a section. If the
      // browser clamps a requested step, settle at that new boundary.
      if (Math.abs(expected - next) > 1.5) target = position = expected;
      if (Math.abs(target - expected) <= settleDistance && target !== expected) {
        window.scrollTo({ top: target, behavior: instant });
        expected = position = window.scrollY;
      }
      if (Math.abs(target - expected) > settleDistance)
        frame = requestAnimationFrame(step);
      else {
        target = position = expected;
        previousTime = 0;
        direction = 0;
        jump = null;
      }
    };

    const belongsToNativeControlOrScroller = (source: Element) => {
      let element: Element | null = source;
      while (
        element &&
        element !== document.body &&
        element !== document.documentElement
      ) {
        if (
          element.matches(
            "input, select, textarea, [contenteditable]:not([contenteditable='false']), dialog[open], [aria-modal='true'], [role='dialog'], [data-native-scroll]",
          )
        )
          return true;
        if (element instanceof HTMLElement) {
          const vertical = element.scrollHeight > element.clientHeight + 1;
          const horizontal = element.scrollWidth > element.clientWidth + 1;
          if (!vertical && !horizontal) {
            element = element.parentElement;
            continue;
          }
          const style = getComputedStyle(element);
          // Yield at both ends as well: the browser decides whether a nested
          // scroller should chain or contain the wheel gesture. This includes
          // horizontal tables and chips, whose native gestures must not fight
          // the document's animation owner.
          if (
            (vertical && /^(auto|scroll|overlay)$/.test(style.overflowY)) ||
            (horizontal && /^(auto|scroll|overlay)$/.test(style.overflowX))
          )
            return true;
        }
        element = element.parentElement;
      }
      return false;
    };

    const onWheel = (event: WheelEvent) => {
      const source = event.target;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && event.deltaX)
        precisionUntil = performance.now() + 180;
      if (
        event.defaultPrevented ||
        !event.cancelable ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        reduced.matches ||
        !(source instanceof Element) ||
        !root.contains(source) ||
        !event.deltaY ||
        Math.abs(event.deltaX) > 0
      ) {
        cancel();
        return;
      }

      const magnitude = Math.abs(event.deltaY);
      // Discrete wheel devices normally report line/page units or regular
      // 100/120-pixel steps. Smaller/fractional precision-pad deltas pass through.
      const discrete =
        event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL ||
        (Number.isInteger(magnitude) &&
          magnitude >= 80 &&
          (magnitude % 20 === 0 || magnitude % 100 === 0));
      const now = performance.now();
      // Precision-pad inertia can briefly cross a regular 80/100/120 px value.
      // Keep the whole gesture native once any precision delta is observed.
      if (!discrete) precisionUntil = now + 180;
      if (
        !discrete ||
        now < precisionUntil ||
        belongsToNativeControlOrScroller(source) ||
        isPageLocked() ||
        getComputedStyle(document.body).overflowY === "hidden" ||
        getComputedStyle(document.documentElement).overflowY === "hidden"
      ) {
        cancel();
        return;
      }

      const multiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;
      const delta = event.deltaY * multiplier;
      const nextDirection = Math.sign(delta);
      const current = window.scrollY;
      const maximum = maximumScroll();
      // Only accumulate against our own last written position. A focus jump or
      // scrollbar drag occurring before its scroll event must take precedence.
      const continuing =
        frame &&
        !jump &&
        direction === nextDirection &&
        Math.abs(current - expected) <= 1.5;
      const base = continuing ? target : current;
      const nextTarget = Math.min(maximum, Math.max(0, base + delta));
      if (Math.abs(nextTarget - current) < 1) {
        cancel();
        return;
      }

      event.preventDefault();
      if (!continuing) cancel();
      jump = null;
      target = nextTarget;
      direction = nextDirection;
      if (!frame) {
        expected = current;
        previousTime = 0;
        frame = requestAnimationFrame(step);
      }
    };
    const onScroll = () => {
      if (frame && Math.abs(window.scrollY - expected) > 1.5) cancel();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (navigationKeys.has(event.key) || event.ctrlKey || event.metaKey)
        cancel();
    };
    const onScrollRequest = (event: Event) => {
      if (!(event instanceof CustomEvent) || event.defaultPrevented) return;
      const top: unknown = event.detail?.top;
      if (typeof top !== "number" || !Number.isFinite(top)) return;
      event.preventDefault();
      cancel();
      if (isPageLocked()) return;
      const maximum = maximumScroll();
      target = Math.min(maximum, Math.max(0, top));
      if (reduced.matches) {
        window.scrollTo({ top: target, behavior: instant });
        return;
      }
      const distance = Math.abs(target - expected);
      if (distance < 1) return;
      jump = {
        from: expected,
        start: performance.now(),
        duration: Math.min(620, Math.max(260, 200 + Math.sqrt(distance) * 7)),
      };
      frame = requestAnimationFrame(step);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", cancel, { passive: true });
    window.addEventListener("hashchange", cancel);
    window.addEventListener("servebase:navigate", cancel);
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    window.addEventListener(scrollRequestEvent, onScrollRequest);
    reduced.addEventListener("change", cancel);
    return () => {
      cancel();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", cancel);
      window.removeEventListener("hashchange", cancel);
      window.removeEventListener("servebase:navigate", cancel);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
      window.removeEventListener(scrollRequestEvent, onScrollRequest);
      reduced.removeEventListener("change", cancel);
    };
  }, [rootRef, sceneKey]);
}
