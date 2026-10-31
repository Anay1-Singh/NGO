import { useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useSmoothWheel } from "./ServeBaseSmoothScroll";
import "./ServeBaseMotion.css";

type MotionSurfaceProps = {
  children: ReactNode;
  className?: string;
  sceneKey?: string;
};

const interactiveSelector = "button, a[href], [role='button']";

function interactionTarget(event: Event, root: HTMLElement) {
  const source = event.target;
  const target =
    source instanceof Element
      ? source.closest<HTMLElement>(interactiveSelector)
      : null;
  if (
    !target ||
    !root.contains(target) ||
    target.matches(":disabled, [aria-disabled='true'], [data-motion='off']") ||
    target.closest("[inert]")
  )
    return null;
  return target;
}

/** Once-only entrances. Pass data-motion-reveal="left|right|scale|stagger". */
export function useScrollScenes(
  rootRef: RefObject<HTMLElement | null>,
  sceneKey?: string,
) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const registered = new Set<HTMLElement>();
    let frame = 0;
    let entranceIndex = 0;
    const reveal = (element: HTMLElement) => {
      element.dataset.motionRevealState = "visible";
      observer?.unobserve(element);
    };
    const observer =
      !reduced.matches && "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) reveal(entry.target as HTMLElement);
              });
            },
            { threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
          )
        : null;
    const registerBranch = (branch: Element) => {
      const metricSelector =
        ".db-main .db-metric-card, .db-overview-middle > .db-panel, .db-overview-bottom > .db-panel";
      const metrics = [
        ...(branch.matches(metricSelector) ? [branch as HTMLElement] : []),
        ...branch.querySelectorAll<HTMLElement>(metricSelector),
      ];
      metrics.forEach((element) => {
        if (element.hasAttribute("data-motion-reveal")) return;
        element.dataset.motionReveal = "up";
        element.dataset.motionDelay = String((entranceIndex++ % 4) * 45);
      });
      const reveals = [
        ...(branch.matches("[data-motion-reveal]")
          ? [branch as HTMLElement]
          : []),
        ...branch.querySelectorAll<HTMLElement>("[data-motion-reveal]"),
      ];
      const pending = reveals.filter((element) => !registered.has(element));
      // Measure the new branch as a batch before any reveal-state/style writes.
      const inView = pending.map((element) => {
        if (!observer || reduced.matches) return true;
        const bounds = element.getBoundingClientRect();
        return bounds.top < innerHeight && bounds.bottom > 0;
      });
      pending.forEach((element, index) => {
        registered.add(element);
        const rawDelay =
          element.dataset.motionDelay ?? element.dataset.revealDelay;
        const delay = Math.max(0, Math.min(240, Number(rawDelay) || 0));
        element.style.setProperty(
          "--motion-reveal-delay",
          rawDelay !== undefined
            ? `${delay}ms`
            : element.style.getPropertyValue("--motion-delay") || "0ms",
        );
        // Above-the-fold content is ready for the route snapshot immediately.
        if (inView[index]) reveal(element);
        else {
          element.dataset.motionRevealState = "waiting";
          observer?.observe(element);
        }
      });
    };
    const updateProgress = () => {
      frame = 0;
      const scrolled = String(window.scrollY > 32);
      if (root.dataset.motionScrolled !== scrolled)
        root.dataset.motionScrolled = scrolled;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateProgress);
    };
    const onReducedChange = () => {
      root.dataset.motionPreference = reduced.matches ? "reduced" : "full";
      if (reduced.matches) registered.forEach(reveal);
    };
    root.dataset.motionPreference = reduced.matches ? "reduced" : "full";
    registerBranch(root);
    updateProgress();
    const changes = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes") {
          if (mutation.target instanceof Element)
            registerBranch(mutation.target);
          return;
        }
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) registerBranch(node);
        });
        mutation.removedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          registered.forEach((element) => {
            if (node === element || node.contains(element)) {
              observer?.unobserve(element);
              registered.delete(element);
            }
          });
        });
      });
    });
    changes.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-motion-reveal",
        "data-motion-delay",
        "data-reveal-delay",
      ],
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    reduced.addEventListener("change", onReducedChange);
    return () => {
      observer?.disconnect();
      changes.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reduced.removeEventListener("change", onReducedChange);
    };
  }, [rootRef, sceneKey]);
}

/** App-wide, delegated pointer feedback; controls retain their native behavior. */
export function MotionSurface({
  children,
  className = "",
  sceneKey,
}: MotionSurfaceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const nextRipple = useRef(0);
  useScrollScenes(rootRef, sceneKey);
  useSmoothWheel(rootRef, sceneKey);

  useEffect(() => {
    const root = rootRef.current;
    const hover = hoverRef.current;
    const overlay = overlayRef.current;
    if (!root || !hover || !overlay) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const ripples = new Map<HTMLDivElement, ReturnType<typeof setTimeout>>();
    let hovered: HTMLElement | null = null;
    let pressed: HTMLElement | null = null;
    let pointerFrame = 0;
    let nextX = 0;
    let nextY = 0;
    let hoverRect: DOMRect | null = null;

    const decorateControl = (target: HTMLElement) => {
      target.classList.add("sb-motion-target");
      const buttonLike =
        target.tagName === "BUTTON" ||
        target.getAttribute("role") === "button" ||
        /button|\bbtn\b|action|cta/.test(target.className);
      target.dataset.motionControl = buttonLike ? "button" : "link";
      if ((target.textContent || "").trim().length > 1)
        target.classList.add("sb-motion-labeled");
    };
    const decorateBranch = (branch: Element) => {
      if (hovered && !root.contains(hovered)) clearHover();
      if (pressed && !root.contains(pressed)) clearPressed();
      if (branch instanceof HTMLElement && branch.matches(interactiveSelector))
        decorateControl(branch);
      branch
        .querySelectorAll<HTMLElement>(interactiveSelector)
        .forEach(decorateControl);
    };
    const clearHover = () => {
      hover.dataset.active = "false";
      hovered?.removeAttribute("data-motion-hover");
      hovered = null;
      hoverRect = null;
    };
    const clearPressed = () => {
      pressed?.removeAttribute("data-motion-pressed");
      pressed = null;
    };
    const clearRipples = () => {
      ripples.forEach((timer, clip) => {
        clearTimeout(timer);
        timers.delete(timer);
        clip.remove();
      });
      ripples.clear();
    };
    const onScroll = () => {
      clearHover();
      if (ripples.size) clearRipples();
    };
    const paintPointer = () => {
      pointerFrame = 0;
      if (!hovered || reduced.matches || !fine.matches) return;
      if (!hoverRect) {
        hoverRect = hovered.getBoundingClientRect();
        hover.style.left = `${hoverRect.left}px`;
        hover.style.top = `${hoverRect.top}px`;
        hover.style.width = `${hoverRect.width}px`;
        hover.style.height = `${hoverRect.height}px`;
        hover.style.borderRadius = getComputedStyle(hovered).borderRadius;
        hover.dataset.theme =
          hovered.closest("[data-theme]")?.getAttribute("data-theme") || "dark";
      }
      const rect = hoverRect;
      hover.style.setProperty("--motion-pointer-x", `${nextX - rect.left}px`);
      hover.style.setProperty("--motion-pointer-y", `${nextY - rect.top}px`);
      hover.dataset.active = "true";
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || reduced.matches || !fine.matches)
        return;
      const target = interactionTarget(event, root);
      if (target !== hovered) {
        clearHover();
        hovered = target;
        if (target) {
          decorateControl(target);
          target.dataset.motionHover = "true";
          // Alternate equivalent animation names to restart the sheen without
          // forcing a synchronous layout between class writes.
          hover.dataset.sweep = hover.dataset.sweep === "a" ? "b" : "a";
        }
      }
      nextX = event.clientX;
      nextY = event.clientY;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(paintPointer);
    };
    const onPointerOut = (event: PointerEvent) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !root.contains(event.relatedTarget)
      )
        clearHover();
    };
    const onPointerDown = (event: PointerEvent) => {
      clearPressed();
      const target = interactionTarget(event, root);
      if (target && event.button === 0) {
        decorateControl(target);
        pressed = target;
        target.dataset.motionPressed = "true";
      }
    };
    const onClick = (event: MouseEvent) => {
      const target = interactionTarget(event, root);
      if (!target || reduced.matches) return;
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const keyboard = event.detail === 0;
      const id = ++nextRipple.current;
      const clip = document.createElement("div");
      clip.className = "sb-motion-ripple-clip";
      clip.dataset.theme = target.closest("[data-theme]")?.getAttribute("data-theme") || "dark";
      Object.assign(clip.style, {
        left: `${rect.left}px`, top: `${rect.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`,
        borderRadius: getComputedStyle(target).borderRadius,
      });
      const ripple = document.createElement("span");
      ripple.className = "sb-motion-ripple";
      const diameter = Math.hypot(rect.width, rect.height) * 2;
      Object.assign(ripple.style, {
        left: `${keyboard ? rect.width / 2 : event.clientX - rect.left}px`,
        top: `${keyboard ? rect.height / 2 : event.clientY - rect.top}px`,
        width: `${diameter}px`, height: `${diameter}px`,
      });
      clip.append(ripple);
      // Decorative feedback never schedules a React render of the application.
      if (ripples.size >= 4) {
        const oldest = ripples.entries().next().value;
        if (oldest) {
          clearTimeout(oldest[1]);
          timers.delete(oldest[1]);
          oldest[0].remove();
          ripples.delete(oldest[0]);
        }
      }
      overlay.append(clip);
      root.dataset.motionLastAction = keyboard ? "keyboard" : "pointer";
      root.dataset.motionRippleCount = String(id);
      const timer = setTimeout(() => {
        clip.remove();
        ripples.delete(clip);
        timers.delete(timer);
      }, 620);
      ripples.set(clip, timer);
      timers.add(timer);
    };
    const onPreferenceChange = () => {
      if (reduced.matches) {
        clearHover();
        clearPressed();
        clearRipples();
      }
    };
    decorateBranch(root);
    const changes = new MutationObserver((mutations) => {
      if (hovered && !root.contains(hovered)) clearHover();
      if (pressed && !root.contains(pressed)) clearPressed();
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) decorateBranch(node);
        });
      });
    });
    changes.observe(root, { childList: true, subtree: true });
    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerout", onPointerOut, { passive: true });
    root.addEventListener("pointerdown", onPointerDown, { passive: true });
    root.addEventListener("click", onClick);
    root.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("pointerup", clearPressed, { passive: true });
    window.addEventListener("pointercancel", clearPressed, { passive: true });
    window.addEventListener("blur", clearPressed);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("hashchange", onScroll);
    window.addEventListener("servebase:navigate", onScroll);
    reduced.addEventListener("change", onPreferenceChange);
    return () => {
      changes.disconnect();
      clearHover();
      clearPressed();
      clearRipples();
      cancelAnimationFrame(pointerFrame);
      timers.forEach(clearTimeout);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerout", onPointerOut);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("click", onClick);
      root.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("pointerup", clearPressed);
      window.removeEventListener("pointercancel", clearPressed);
      window.removeEventListener("blur", clearPressed);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", onScroll);
      window.removeEventListener("servebase:navigate", onScroll);
      reduced.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`sb-motion-surface ${className}`}
      data-motion-root
    >
      {children}
      {createPortal(
        <div ref={overlayRef} className="sb-motion-overlay" aria-hidden="true">
          <div ref={hoverRef} className="sb-motion-hover" data-active="false" />
        </div>,
        document.body,
      )}
    </div>
  );
}
