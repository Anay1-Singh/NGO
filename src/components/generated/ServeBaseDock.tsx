import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Icon } from "./ServeBaseIcons";
import type { IconName } from "./ServeBaseIcons";
import { smoothScrollTo } from "./ServeBaseSmoothScroll";
import "./ServeBaseDock.css";

type Edge = "top" | "right" | "bottom" | "left" | "float";
type Axis = "horizontal" | "vertical";
type Placement = {
  edge: Edge;
  axis: Axis;
  anchor: number;
  x: number;
  y: number;
};
type DockItem = { path: string; label: string; short: string; icon: string };
type Box = { left: number; top: number; width: number; height: number };
type Drag = {
  pointer: number;
  capture: HTMLElement;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  left: number;
  top: number;
  width: number;
  height: number;
  moved: boolean;
  original: Placement;
};
const storageKey = "servebase-dock-v1";
const defaults: Placement = {
  edge: "bottom",
  axis: "horizontal",
  anchor: 0.5,
  x: 0.5,
  y: 0.78,
};
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(Math.max(min, max), value));
const unit = (value: number) => clamp(value, 0, 1);
const colors = ["#8edafa", "#c4b5fd", "#f0b6a8", "#95c5fa", "#e9ca8e"];
function readPlacement(): Placement {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(storageKey) || "null",
    );
    if (!saved || typeof saved !== "object") return defaults;
    const p = saved as Partial<Placement>;
    if (
      !["top", "right", "bottom", "left", "float"].includes(p.edge || "") ||
      !["horizontal", "vertical"].includes(p.axis || "") ||
      ![p.anchor, p.x, p.y].every(
        (value) => typeof value === "number" && Number.isFinite(value),
      )
    )
      return defaults;
    return {
      edge: p.edge!,
      axis:
        p.edge === "left" || p.edge === "right"
          ? "vertical"
          : p.edge === "top" || p.edge === "bottom"
            ? "horizontal"
            : p.axis!,
      anchor: unit(p.anchor!),
      x: unit(p.x!),
      y: unit(p.y!),
    };
  } catch {
    return defaults;
  }
}
function viewport() {
  return {
    width: document.documentElement.clientWidth,
    height: window.visualViewport?.height || innerHeight,
  };
}
function bounds(width: number, height: number) {
  const view = viewport();
  return {
    minX: 12,
    minY: 12,
    maxX: Math.max(12, view.width - width - 12),
    maxY: Math.max(12, view.height - height - 12),
  };
}
function pointFor(p: Placement, width: number, height: number) {
  const view = viewport();
  const b = bounds(width, height);
  const rail = view.width > 980 ? 84 : view.width > 700 ? 64 : 0;
  const leftEdge = rail ? rail + 12 : 12;
  if (p.edge === "left" || p.edge === "right")
    return {
      left: p.edge === "left" ? Math.min(leftEdge, b.maxX) : b.maxX,
      top: b.minY + (b.maxY - b.minY) * p.anchor,
    };
  if (p.edge === "top" || p.edge === "bottom")
    return {
      left: b.minX + (b.maxX - b.minX) * p.anchor,
      top: p.edge === "top" ? 16 : b.maxY - 4,
    };
  return {
    left: b.minX + (b.maxX - b.minX) * p.x,
    top: b.minY + (b.maxY - b.minY) * p.y,
  };
}
function nearestEdge(x: number, y: number): Edge {
  const v = viewport();
  const rail = v.width > 980 ? 84 : v.width > 700 ? 64 : 0;
  const distances = [
    { edge: "left" as Edge, distance: Math.max(0, x - rail) },
    { edge: "right" as Edge, distance: v.width - x },
    { edge: "top" as Edge, distance: y },
    { edge: "bottom" as Edge, distance: v.height - y },
  ];
  distances.sort((a, b) => a.distance - b.distance);
  return distances[0].distance < 68 ? distances[0].edge : "float";
}
function Grip() {
  return (
    <svg
      viewBox="0 0 12 20"
      width="12"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      {[4, 10, 16].map((y) => (
        <g key={y}>
          <circle cx="3" cy={y} r="1.2" />
          <circle cx="9" cy={y} r="1.2" />
        </g>
      ))}
    </svg>
  );
}
function PositionIcon({ edge }: { edge: Edge }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="16"
        height="16"
        rx="3"
        stroke="currentColor"
        opacity=".45"
      />
      {edge === "left" || edge === "right" ? (
        <rect
          x={edge === "left" ? 4 : 12}
          y="5"
          width="4"
          height="10"
          rx="1"
          fill="currentColor"
        />
      ) : edge === "top" || edge === "bottom" ? (
        <rect
          x="5"
          y={edge === "top" ? 4 : 12}
          width="10"
          height="4"
          rx="1"
          fill="currentColor"
        />
      ) : (
        <rect x="6" y="7" width="8" height="6" rx="2" fill="currentColor" />
      )}
    </svg>
  );
}

/** A positionable navigation surface. Drag is isolated from links and form controls. */
export function ServeBaseDock({
  items,
  currentPath,
  route,
}: {
  items: DockItem[];
  currentPath?: string;
  route: string;
}) {
  const [placement, setPlacement] = useState<Placement>(readPlacement);
  const placementRef = useRef(placement);
  placementRef.current = placement;
  const dock = useRef<HTMLElement>(null);
  const surface = useRef<HTMLSpanElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const options = useRef<HTMLButtonElement>(null);
  const drag = useRef<Drag | null>(null);
  const pointerFrame = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const suppressedClick = useRef(false);
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragging, setDragging] = useState(false);
  const [candidate, setCandidate] = useState<Edge>("float");
  const candidateRef = useRef<Edge>("float");
  const [settings, setSettings] = useState(false);
  const [panelPoint, setPanelPoint] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const previousBox = useRef<Box | null>(null);
  const previousItems = useRef(new Map<string, Box>());
  const animations = useRef<Animation[]>([]);
  const layoutRef = useRef<(animate?: boolean) => void>(() => {});
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  function rememberGeometry() {
    const node = dock.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    previousBox.current = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
    previousItems.current = new Map(
      Array.from(node.querySelectorAll<HTMLElement>("[data-dock-key]")).map(
        (el) => [el.dataset.dockKey!, el.getBoundingClientRect()],
      ),
    );
  }
  function stopAnimations() {
    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
  }
  function positionPanel() {
    const node = dock.current;
    const menu = panel.current;
    if (!node || !menu) return;
    const rect = node.getBoundingClientRect();
    const v = viewport();
    menu.style.maxHeight = `${Math.max(120, v.height - 24)}px`;
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    let left = rect.left + rect.width / 2 - width / 2;
    let top = rect.top - height - 12;
    if (placementRef.current.axis === "vertical") {
      left = rect.left > v.width / 2 ? rect.left - width - 12 : rect.right + 12;
      top = rect.top + rect.height / 2 - height / 2;
    } else if (top < 12) top = rect.bottom + 12;
    setPanelPoint({
      left: clamp(left, 12, v.width - width - 12),
      top: clamp(top, 12, v.height - height - 12),
    });
  }
  function closeSettings(restore = true) {
    setSettings(false);
    setPanelPoint(null);
    if (restore) options.current?.focus({ preventScroll: true });
  }
  function commit(next: Placement, message?: string) {
    rememberGeometry();
    setSettings(false);
    setPanelPoint(null);
    setPlacement(next);
    if (message) setAnnouncement(message);
  }
  function chooseEdge(edge: Edge) {
    const p = placementRef.current;
    const rect = dock.current?.getBoundingClientRect();
    const axis: Axis =
      edge === "left" || edge === "right"
        ? "vertical"
        : edge === "float"
          ? p.axis
          : "horizontal";
    let next: Placement = { ...p, edge, axis, anchor: 0.5 };
    if (edge === "float" && rect) {
      const b = bounds(rect.width, rect.height);
      next = {
        ...next,
        x: unit((rect.left - b.minX) / (b.maxX - b.minX || 1)),
        y: unit((rect.top - b.minY) / (b.maxY - b.minY || 1)),
      };
    }
    commit(
      next,
      edge === "float"
        ? "Navigation is floating. Drag the grip to move it."
        : `Navigation docked ${edge}. ${axis} layout.`,
    );
    handle.current?.focus({ preventScroll: true });
  }
  useLayoutEffect(() => {
    const node = dock.current;
    if (!node) return;
    const layout = (animate = false) => {
      if (drag.current) return;
      const old = previousBox.current;
      const oldItems = previousItems.current;
      node.style.setProperty(
        "--dock-available-height",
        `${Math.max(130, viewport().height - 24)}px`,
      );
      const width = node.offsetWidth,
        height = node.offsetHeight;
      const p = placementRef.current;
      const point = pointFor(p, width, height);
      if (
        !animate &&
        old &&
        Math.abs(old.left - point.left) < 0.5 &&
        Math.abs(old.top - point.top) < 0.5 &&
        old.width === width &&
        old.height === height &&
        Math.abs(parseFloat(node.style.left) - point.left) < 0.5 &&
        Math.abs(parseFloat(node.style.top) - point.top) < 0.5
      )
        return;
      stopAnimations();
      node.style.left = `${point.left}px`;
      node.style.top = `${point.top}px`;
      node.dataset.ready = "true";
      const host = node.closest<HTMLElement>(".sx");
      if (host) {
        host.dataset.dockEdge = p.edge;
        host.style.setProperty(
          "--sb-dock-gutter",
          `${p.axis === "vertical" ? width + 24 : 0}px`,
        );
      }
      const newItems = new Map(
        Array.from(node.querySelectorAll<HTMLElement>("[data-dock-key]")).map(
          (el) => [el, el.getBoundingClientRect()],
        ),
      );
      if (animate && old && !reduced()) {
        const duration = 460;
        const easing = "cubic-bezier(.2,.8,.2,1)";
        animations.current.push(
          node.animate(
            [
              {
                transform: `translate(${old.left - point.left}px,${old.top - point.top}px)`,
              },
              { transform: "translate(0,0)" },
            ],
            { duration, easing },
          ),
        );
        if (surface.current && (old.width !== width || old.height !== height))
          animations.current.push(
            surface.current.animate(
              [
                {
                  transform: `scale(${old.width / width},${old.height / height})`,
                },
                { transform: "scale(1,1)" },
              ],
              { duration, easing },
            ),
          );
        newItems.forEach((now, el) => {
          const last = oldItems.get(el.dataset.dockKey!);
          if (!last) return;
          const dx = last.left - old.left - (now.left - point.left);
          const dy = last.top - old.top - (now.top - point.top);
          if (Math.abs(dx) + Math.abs(dy) > 1)
            animations.current.push(
              el.animate(
                [{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }],
                { duration: 400, easing },
              ),
            );
        });
      }
      previousBox.current = { ...point, width, height };
      previousItems.current = new Map(
        Array.from(newItems).map(([el, rect]) => [el.dataset.dockKey!, rect]),
      );
      if (panel.current) positionPanel();
    };
    layoutRef.current = layout;
    layout(true);
    const observer = new ResizeObserver(() => layout(false));
    observer.observe(node);
    const onResize = () => {
      if (drag.current) cancelDrag();
      layout(false);
      if (panel.current) positionPanel();
    };
    addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [placement]);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => {
      if (preference.matches) {
        stopAnimations();
        layoutRef.current(false);
      }
    };
    preference.addEventListener("change", changed);
    return () => preference.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(placement));
    } catch {
      /* Position remains usable without browser storage. */
    }
  }, [placement]);
  useEffect(() => {
    closeSettings(false);
    cancelDrag();
  }, [route]);
  useEffect(() => {
    const blur = () => cancelDrag();
    addEventListener("blur", blur);
    return () => removeEventListener("blur", blur);
  }, []);
  useLayoutEffect(() => {
    if (settings) {
      positionPanel();
      requestAnimationFrame(() =>
        panel.current
          ?.querySelector<HTMLButtonElement>("button[aria-pressed=true],button")
          ?.focus({ preventScroll: true }),
      );
    }
  }, [settings]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const source = event.target;
      if (
        source instanceof Node &&
        !panel.current?.contains(source) &&
        !options.current?.contains(source) &&
        !handle.current?.contains(source)
      )
        closeSettings(false);
    };
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        closeSettings(false);
        cancelDrag();
        return;
      }
      if (event.key !== "Escape") return;
      if (drag.current) {
        event.preventDefault();
        cancelDrag();
      } else if (settings) {
        event.preventDefault();
        closeSettings();
      }
    };
    if (settings) document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [settings]);
  useEffect(
    () => () => {
      cancelAnimationFrame(pointerFrame.current);
      if (suppressTimer.current) clearTimeout(suppressTimer.current);
      const active = drag.current;
      if (active?.capture.hasPointerCapture(active.pointer))
        active.capture.releasePointerCapture(active.pointer);
      document.documentElement.classList.remove("sb-dock-is-dragging");
      stopAnimations();
    },
    [],
  );

  function beginDrag(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || !dock.current || drag.current) return;
    if (
      event.currentTarget === dock.current &&
      event.target !== event.currentTarget &&
      event.target !== surface.current
    )
      return;
    stopAnimations();
    setSettings(false);
    setPanelPoint(null);
    const rect = dock.current.getBoundingClientRect();
    drag.current = {
      pointer: event.pointerId,
      capture: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
      original: placementRef.current,
    };
    pointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    handle.current?.focus({ preventScroll: true });
  }
  function paintDrag() {
    pointerFrame.current = 0;
    const active = drag.current;
    const node = dock.current;
    if (!active || !node) return;
    const { x, y } = pointer.current;
    if (!active.moved && Math.hypot(x - active.startX, y - active.startY) < 5)
      return;
    if (!active.moved) {
      active.moved = true;
      setDragging(true);
      document.documentElement.classList.add("sb-dock-is-dragging");
    }
    const b = bounds(active.width, active.height);
    active.left = clamp(x - active.offsetX, b.minX, b.maxX);
    active.top = clamp(y - active.offsetY, b.minY, b.maxY);
    node.style.left = `${active.left}px`;
    node.style.top = `${active.top}px`;
    const edge = nearestEdge(x, y);
    if (candidateRef.current !== edge) {
      candidateRef.current = edge;
      setCandidate(edge);
    }
  }
  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current || event.pointerId !== drag.current.pointer) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (!pointerFrame.current)
      pointerFrame.current = requestAnimationFrame(paintDrag);
  }
  function finishDrag(event: ReactPointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active || event.pointerId !== active.pointer) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    cancelAnimationFrame(pointerFrame.current);
    paintDrag();
    const moved = active.moved;
    if (active.capture.hasPointerCapture(active.pointer))
      active.capture.releasePointerCapture(active.pointer);
    drag.current = null;
    setDragging(false);
    setCandidate("float");
    candidateRef.current = "float";
    document.documentElement.classList.remove("sb-dock-is-dragging");
    if (!moved) return;
    suppressedClick.current = true;
    if (suppressTimer.current) clearTimeout(suppressTimer.current);
    suppressTimer.current = setTimeout(
      () => (suppressedClick.current = false),
      250,
    );
    const edge = nearestEdge(event.clientX, event.clientY);
    const v = viewport();
    const b = bounds(active.width, active.height);
    const next: Placement = {
      edge,
      axis:
        edge === "left" || edge === "right"
          ? "vertical"
          : edge === "top" || edge === "bottom"
            ? "horizontal"
            : active.original.axis,
      anchor:
        edge === "left" || edge === "right"
          ? unit(event.clientY / v.height)
          : unit(event.clientX / v.width),
      x: unit((active.left - b.minX) / (b.maxX - b.minX || 1)),
      y: unit((active.top - b.minY) / (b.maxY - b.minY || 1)),
    };
    commit(
      next,
      edge === "float"
        ? "Navigation moved. Position saved."
        : `Navigation docked ${edge}. ${next.axis} layout. Position saved.`,
    );
  }
  function cancelDrag() {
    const active = drag.current;
    if (!active) return;
    cancelAnimationFrame(pointerFrame.current);
    drag.current = null;
    if (active.capture.hasPointerCapture(active.pointer))
      active.capture.releasePointerCapture(active.pointer);
    setDragging(false);
    setCandidate("float");
    candidateRef.current = "float";
    document.documentElement.classList.remove("sb-dock-is-dragging");
    rememberGeometry();
    layoutRef.current(true);
    if (active.moved) {
      suppressedClick.current = true;
      if (suppressTimer.current) clearTimeout(suppressTimer.current);
      suppressTimer.current = setTimeout(
        () => (suppressedClick.current = false),
        250,
      );
    }
    setAnnouncement("Move cancelled. Previous position restored.");
  }
  function handleKeys(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const edges: Record<string, Edge> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "top",
      ArrowDown: "bottom",
    };
    if (event.key === "Home") {
      event.preventDefault();
      commit({ ...defaults }, "Navigation reset to bottom.");
      return;
    }
    if (!edges[event.key]) return;
    event.preventDefault();
    if (event.altKey) {
      chooseEdge(edges[event.key]);
      return;
    }
    const rect = dock.current?.getBoundingClientRect();
    if (!rect) return;
    const delta = event.shiftKey ? 48 : 16;
    const b = bounds(rect.width, rect.height);
    const left = clamp(
      rect.left +
        (event.key === "ArrowLeft"
          ? -delta
          : event.key === "ArrowRight"
            ? delta
            : 0),
      b.minX,
      b.maxX,
    );
    const top = clamp(
      rect.top +
        (event.key === "ArrowUp"
          ? -delta
          : event.key === "ArrowDown"
            ? delta
            : 0),
      b.minY,
      b.maxY,
    );
    commit(
      {
        ...placementRef.current,
        edge: "float",
        x: unit((left - b.minX) / (b.maxX - b.minX || 1)),
        y: unit((top - b.minY) / (b.maxY - b.minY || 1)),
      },
      "Floating navigation moved. Use arrow keys to adjust.",
    );
  }
  function toggleSettings() {
    setSettings((open) => !open);
    setPanelPoint(null);
  }

  return (
    <>
      {dragging && candidate !== "float" && (
        <div
          className="sb-dock-drop-zone"
          data-edge={candidate}
          aria-hidden="true"
        >
          <PositionIcon edge={candidate} />
          <span>Release to dock {candidate}</span>
        </div>
      )}
      <nav
        ref={dock}
        className="sx-dock sb-dock"
        aria-label="Main navigation"
        data-axis={placement.axis}
        data-edge={placement.edge}
        data-dragging={dragging}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={() => {
          if (drag.current) cancelDrag();
        }}
      >
        <span ref={surface} className="sb-dock-surface" aria-hidden="true" />
        <button
          ref={handle}
          type="button"
          className="sb-dock-handle"
          data-dock-key="handle"
          data-motion="off"
          aria-label="Move navigation bar"
          aria-expanded={settings}
          aria-controls="sb-dock-settings"
          aria-haspopup="dialog"
          aria-describedby="sb-dock-help"
          aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown Home"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={cancelDrag}
          onKeyDown={handleKeys}
          onClick={(event) => {
            if (suppressedClick.current && event.detail > 0) {
              event.preventDefault();
              suppressedClick.current = false;
              return;
            }
            toggleSettings();
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            setSettings(true);
          }}
        >
          <Grip />
        </button>
        <span className="sb-dock-grip-tip" role="tooltip">
          Drag to move · Snap to any edge
        </span>
        <span className="sb-dock-help" id="sb-dock-help">
          Drag to move. Edges change the layout. Arrow keys move the bar; Alt
          plus an arrow docks it to that edge. Home resets the position. Click
          for position controls.
        </span>
        <div className="sb-dock-links">
          {items.map((item, i) => (
            <a
              key={item.path}
              className="sb-dock-item"
              data-dock-key={item.path}
              href={`#${item.path}`}
              aria-label={item.label}
              aria-current={currentPath === item.path ? "page" : undefined}
              style={
                {
                  "--dock-item-color": colors[i % colors.length],
                } as CSSProperties
              }
            >
              <span className="sb-dock-icon">
                <Icon name={item.icon as IconName} size={18} />
              </span>
              <span className="sb-dock-label">
                <span className="sb-dock-label-full">{item.short}</span>
                <span className="sb-dock-label-compact">
                  {item.path === "/architecture" ? "System" : item.short}
                </span>
              </span>
              <span className="sb-dock-active" aria-hidden="true" />
              <span className="sb-dock-item-tip" aria-hidden="true">
                {item.label}
              </span>
            </a>
          ))}
        </div>
        <span className="sb-dock-divider" aria-hidden="true" />
        <div className="sb-dock-tools">
          <button
            type="button"
            className="sx-dock-top sb-dock-top"
            data-dock-key="top"
            aria-label="Back to top"
            onClick={() => smoothScrollTo(0)}
          >
            <Icon name="arrow" size={16} />
          </button>
          <button
            ref={options}
            type="button"
            className="sb-dock-options"
            data-dock-key="options"
            aria-label="Navigation position settings"
            aria-expanded={settings}
            aria-controls="sb-dock-settings"
            onClick={toggleSettings}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 18 18"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="4" cy="9" r="1.2" />
              <circle cx="9" cy="9" r="1.2" />
              <circle cx="14" cy="9" r="1.2" />
            </svg>
          </button>
        </div>
      </nav>
      {settings && (
        <div
          ref={panel}
          id="sb-dock-settings"
          className="sb-dock-settings"
          role="dialog"
          aria-labelledby="sb-dock-settings-title"
          style={{
            left: panelPoint?.left ?? 0,
            top: panelPoint?.top ?? 0,
            visibility: panelPoint ? "visible" : "hidden",
          }}
        >
          <div className="sb-dock-settings-head">
            <span id="sb-dock-settings-title">Navigation position</span>
            <button
              type="button"
              aria-label="Close position settings"
              onClick={() => closeSettings()}
            >
              <Icon name="close" size={15} />
            </button>
          </div>
          <p>Drag the grip, or choose a position.</p>
          <div className="sb-dock-position-grid">
            {(["top", "right", "bottom", "left"] as Edge[]).map((edge) => (
              <button
                key={edge}
                type="button"
                aria-label={`Dock ${edge}`}
                aria-pressed={placement.edge === edge}
                onClick={() => chooseEdge(edge)}
              >
                <PositionIcon edge={edge} />
                <span>{edge[0].toUpperCase() + edge.slice(1)}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="sb-dock-float-option"
            aria-pressed={placement.edge === "float"}
            onClick={() => chooseEdge("float")}
          >
            <PositionIcon edge="float" />
            Float anywhere
            <Icon name="check" size={14} />
          </button>
          <button
            type="button"
            className="sb-dock-reset"
            onClick={() => {
              commit({ ...defaults }, "Navigation reset to bottom.");
              handle.current?.focus({ preventScroll: true });
            }}
          >
            Reset to bottom center
            <Icon name="arrow" size={14} />
          </button>
          <span className="sb-dock-settings-note">
            Position is saved on this device.
          </span>
        </div>
      )}
      <span className="sb-dock-announcement" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
