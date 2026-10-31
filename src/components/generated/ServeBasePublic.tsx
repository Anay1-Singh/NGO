import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Icon } from "./ServeBaseIcons";
import type { IconName } from "./ServeBaseIcons";
import { ThemeToggle } from "./ServeBaseTheme";
import type { Theme } from "./ServeBaseTheme";
import { WorkspacePreview, downloadSampleCsv } from "./ServeBaseInteractions";
import { modules, members, projectFacts } from "./ServeBaseContent";
import type { FeatureContent, FeatureId } from "./ServeBaseContent";
import { smoothScrollToElement } from "./ServeBaseSmoothScroll";
import { ServeBaseDock } from "./ServeBaseDock";
import { WorkflowStory } from "./ServeBaseWorkflowStory";
import { TermsPage } from "./ServeBaseTerms";
import "./ServeBasePublic.css";
import "./ServeBaseWorkflowStory.css";

const pages = [
  { path: "/", label: "Home", short: "Home", icon: "globe", index: "00" },
  {
    path: "/features",
    label: "Features",
    short: "Modules",
    icon: "layers",
    index: "01",
  },
  {
    path: "/impact",
    label: "SDG Impact",
    short: "Impact",
    icon: "heart",
    index: "02",
  },
  {
    path: "/architecture",
    label: "System Architecture",
    short: "Blueprint",
    icon: "code",
    index: "03",
  },
  { path: "/team", label: "Team", short: "People", icon: "users", index: "04" },
];
const titles: Record<string, string> = {
  "/": "The field desk",
  "/features": "Platform modules",
  "/impact": "SDG Impact",
  "/architecture": "System Architecture",
  "/team": "Project contributors",
  "/documentation": "Workspace guide",
  "/terms": "Terms & Conditions",
};
const pageIndex = [
  ...pages.map((page) => ({ ...page, search: page.label })),
  {
    path: "/documentation",
    label: "Field guide",
    index: "05",
    search: "Documentation help backup demo",
  },
  {
    path: "/terms",
    label: "Terms & Conditions",
    index: "06",
    search: "Terms conditions privacy data profile photo storage account use",
  },
];
const moduleIndex = modules.map((module) => ({
  path: `/features/${module.id}`,
  label: module.headline,
  index: module.number,
  search: `${module.name} ${module.tags.join(" ")}`,
}));
function normalizedRoute(route: string) {
  const p = route.replace(/^#/, "").split("?")[0];
  return (
    (
      {
        home: "/",
        features: "/features",
        impact: "/impact",
        architecture: "/architecture",
        team: "/team",
      } as Record<string, string>
    )[p] ||
    p ||
    "/"
  );
}
function Mark() {
  return (
    <span className="sx-mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
function Label({ children }: { children: ReactNode }) {
  return (
    <span className="sx-label">
      <i />
      {children}
    </span>
  );
}
function Reveal({
  children,
  className = "",
  kind = "up",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  kind?: string;
  delay?: number;
}) {
  return (
    <div
      className={className}
      data-motion-reveal={kind}
      data-motion-delay={delay}
    >
      {children}
    </div>
  );
}
function Action({
  href,
  children,
  quiet = false,
}: {
  href: string;
  children: ReactNode;
  quiet?: boolean;
}) {
  return (
    <a className={`sx-action${quiet ? " is-quiet" : ""}`} href={href}>
      <span className="sx-action-words">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </span>
      <span className="sx-action-icon">
        <Icon name="arrow" size={18} />
      </span>
    </a>
  );
}
function Intro({
  number,
  label,
  title,
  copy,
  children,
}: {
  number: string;
  label: string;
  title: ReactNode;
  copy: string;
  children?: ReactNode;
}) {
  return (
    <section className="sx-page-intro sx-container">
      <Reveal>
        <div className="sx-page-number">
          <span>{number}</span>
          <Label>{label}</Label>
        </div>
        <h1>{title}</h1>
        <div className="sx-intro-bottom">
          <p>{copy}</p>
          {children}
        </div>
      </Reveal>
    </section>
  );
}
function useSceneProgress(
  root: RefObject<HTMLDivElement | null>,
  route: string,
) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let frame = 0;
    let measureFrame = 0;
    let disposed = false;
    let scrollRange = 0;
    let viewportHeight = innerHeight;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const scenes = Array.from(
      el.querySelectorAll<HTMLElement>("[data-scroll-scene]"),
    );
    const rail = el.querySelector<HTMLElement>(".sx-rail-progress");
    let railProgress = "";
    let geometry: {
      targets: HTMLElement[];
      top: number;
      height: number;
      progress: string;
    }[] = [];
    const update = () => {
      frame = 0;
      const y = scrollY;
      const nextRail = String(
        scrollRange > 0 ? Math.max(0, Math.min(1, y / scrollRange)) : 0,
      );
      if (nextRail !== railProgress) {
        railProgress = nextRail;
        rail?.style.setProperty("--sx-scroll", nextRail);
      }
      geometry.forEach((scene) => {
        const progress = media.matches
          ? ".5"
          : String(
              Math.max(
                0,
                Math.min(
                  1,
                  (viewportHeight + y - scene.top) /
                    (viewportHeight + scene.height),
                ),
              ),
            );
        if (progress === scene.progress) return;
        scene.progress = progress;
        scene.targets.forEach((target) =>
          target.style.setProperty("--scene-progress", progress),
        );
      });
    };
    const measure = () => {
      measureFrame = 0;
      const y = scrollY;
      viewportHeight = innerHeight;
      scrollRange = document.documentElement.scrollHeight - viewportHeight;
      // Read all geometry together; scrolling itself only writes compositor values.
      geometry = scenes.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          targets: Array.from(
            element.querySelectorAll<HTMLElement>("[data-scroll-motion]"),
          ),
          top: y + rect.top,
          height: rect.height,
          progress: "",
        };
      });
      cancelAnimationFrame(frame);
      update();
    };
    const onResize = () => {
      if (!measureFrame) measureFrame = requestAnimationFrame(measure);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    measure();
    const observer = new ResizeObserver(onResize);
    observer.observe(el);
    scenes.forEach((scene) => observer.observe(scene));
    document.fonts.ready.then(() => {
      if (!disposed) onResize();
    });
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onResize, { passive: true });
    media.addEventListener("change", onScroll);
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(measureFrame);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onResize);
      media.removeEventListener("change", onScroll);
    };
  }, [root, route]);
}

export function ServeBasePublic({
  route,
  theme,
  toggleTheme,
}: {
  route: string;
  theme: Theme;
  toggleTheme: () => void;
}) {
  const path = normalizedRoute(route);
  const root = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [indexQuery, setIndexQuery] = useState("");
  const indexSearch = useRef<HTMLInputElement>(null);
  const query = indexQuery.trim().toLowerCase();
  const indexResults = query
    ? [...pageIndex, ...moduleIndex].filter((entry) =>
        `${entry.label} ${entry.search}`.toLowerCase().includes(query),
      )
    : pageIndex;
  const previous = useRef(path);
  const feature = modules.find((item) => path === `/features/${item.id}`);
  const current = pages.find((item) =>
    item.path === "/" ? path === "/" : path.startsWith(item.path),
  );
  useSceneProgress(root, path);
  useEffect(() => {
    menu.current?.close();
    setMenuOpen(false);
    document.title = `${feature?.name || titles[path] || "Page not found"} — ServeBase`;
    if (previous.current !== path) main.current?.focus({ preventScroll: true });
    previous.current = path;
  }, [path, feature]);
  useEffect(() => {
    if (!menuOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, [menuOpen]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (menu.current?.open) closeMenu();
        else openMenu();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  function openMenu() {
    setIndexQuery("");
    menu.current?.showModal();
    setMenuOpen(true);
    requestAnimationFrame(() => indexSearch.current?.focus());
  }
  function closeMenu() {
    menu.current?.close();
    setMenuOpen(false);
    menuTrigger.current?.focus();
  }
  return (
    <div className="sx" data-page={path} ref={root}>
      <a
        className="sx-skip"
        href="#sx-main"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sx-rail" aria-label="ServeBase identity">
        <a className="sx-rail-logo" href="#/" aria-label="ServeBase home">
          <Mark />
        </a>
        <a className="sx-rail-name" href="#/">
          ServeBase<span>Community operations</span>
        </a>
        <div className="sx-rail-bottom">
          <span>{current?.index || "—"} / 04</span>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <span className="sx-rail-progress" aria-hidden="true" />
      </aside>
      <header className="sx-header">
        <a className="sx-mobile-brand" href="#/">
          <Mark />
          ServeBase
        </a>
        <div className="sx-top-note">
          <span>Field notes / Vol. 01</span>
          <span>{projectFacts.university}</span>
        </div>
        <div className="sx-utility">
          <span className="sx-mobile-theme">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </span>
          <a className="sx-guide-link" href="#/documentation">
            <Icon name="book" size={15} />
            <span>Field guide</span>
          </a>
          <a className="sx-admin-link" href="#/admin/login">
            Open workspace
            <Icon name="arrow" size={15} />
          </a>
          <a className="sx-volunteer-link" href="#/volunteer/login">
            Volunteer access
            <Icon name="arrow" size={14} />
          </a>
          <button
            type="button"
            ref={menuTrigger}
            className="sx-menu-trigger"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            aria-keyshortcuts="Control+K Meta+K"
            onClick={openMenu}
          >
            <span>Index</span>
            <kbd className="sx-shortcut">Ctrl / ⌘ K</kbd>
            <span className="sx-menu-lines">
              <i />
              <i />
            </span>
          </button>
        </div>
      </header>
      <ServeBaseDock items={pages} currentPath={current?.path} route={route} />
      <main
        id="sx-main"
        ref={main}
        tabIndex={-1}
        key={path}
        className="sx-main"
      >
        {path === "/" && <HomePage />}
        {path === "/features" && <FeaturesPage />}
        {feature && <FeaturePage feature={feature} />}
        {path === "/impact" && <ImpactPage />}
        {path === "/architecture" && <ArchitecturePage />}
        {path === "/team" && <TeamPage />}
        {path === "/documentation" && <GuidePage />}
        {path === "/terms" && <TermsPage route={route} />}
        {!feature && !(path in titles) && (
          <>
            <Intro
              number="404"
              label="Outside the index"
              title={
                <>
                  That page
                  <br />
                  <em>has moved off the map.</em>
                </>
              }
              copy="Use the index to return to a register, or head back to the field desk."
            />
            <div className="sx-container sx-missing">
              <Action href="#/">Return home</Action>
            </div>
          </>
        )}
      </main>
      <Footer />
      <dialog
        className="sx-index-dialog"
        ref={menu}
        onClose={() => setMenuOpen(false)}
        onClick={(e) => {
          if (e.target === menu.current) closeMenu();
        }}
        aria-labelledby="sx-index-title"
      >
        <div className="sx-index-inner">
          <div className="sx-index-head">
            <span id="sx-index-title">The ServeBase index</span>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={closeMenu}
            >
              <span>Close</span>
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="sx-index-layout">
            <div className="sx-index-context">
              <Mark />
              <p>
                A place for the work
                <br />
                between good intentions
                <br />
                and the day of a drive.
              </p>
              <span>
                NGO volunteer & donor management
                <br />
                Academic software prototype
              </span>
            </div>
            <div className="sx-index-search-pane">
              <label className="sx-index-search">
                <Icon name="search" size={17} />
                <input
                  ref={indexSearch}
                  type="search"
                  aria-label="Find a page"
                  value={indexQuery}
                  onChange={(event) => setIndexQuery(event.target.value)}
                  placeholder="Find a page or module…"
                  autoComplete="off"
                  spellCheck={false}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      menu.current
                        ?.querySelector<HTMLAnchorElement>("nav a")
                        ?.focus();
                    } else if (event.key === "Enter" && query) {
                      event.preventDefault();
                      menu.current
                        ?.querySelector<HTMLAnchorElement>("nav a")
                        ?.click();
                    }
                  }}
                />
                {indexQuery && (
                  <button
                    type="button"
                    aria-label="Clear page filter"
                    onClick={() => {
                      setIndexQuery("");
                      indexSearch.current?.focus();
                    }}
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </label>
              <div className="sx-index-results-meta">
                <span role="status">
                  {query
                    ? `${indexResults.length} matching ${indexResults.length === 1 ? "destination" : "destinations"}`
                    : "7 pages · Search includes all 4 modules"}
                </span>
                <span>↓ to select</span>
              </div>
              <nav aria-label="Full navigation">
                {indexResults.map((page) => (
                  <a
                    key={page.path}
                    href={`#${page.path}`}
                    onClick={() => {
                      menu.current?.close();
                      setMenuOpen(false);
                    }}
                    aria-current={
                      current?.path === page.path || path === page.path
                        ? "page"
                        : undefined
                    }
                  >
                    <span>{page.index}</span>
                    <strong>{page.label}</strong>
                    <Icon name="arrow" size={28} />
                  </a>
                ))}
              </nav>
              {!indexResults.length && (
                <p className="sx-index-empty">
                  No page matches “{indexQuery}”. Try a module name, CSV, or
                  backup.
                </p>
              )}
            </div>
          </div>
          <div className="sx-index-foot">
            <span>Browse with purpose. Leave with a plan.</span>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <a
              href="#/volunteer/login"
              onClick={() => {
                menu.current?.close();
                setMenuOpen(false);
              }}
            >
              Volunteer access
              <Icon name="arrow" size={16} />
            </a>
            <a
              href="#/admin/login"
              onClick={() => {
                menu.current?.close();
                setMenuOpen(false);
              }}
            >
              Admin access
              <Icon name="arrow" size={16} />
            </a>
          </div>
        </div>
      </dialog>
    </div>
  );
}
const signals = [
  {
    name: "People",
    icon: "users",
    title: "Find the right pair of hands.",
    detail: "Skills, contact details, and the days someone can help.",
    meta: "Volunteer register",
    path: "volunteers",
  },
  {
    name: "Support",
    icon: "heart",
    title: "Know what came in.",
    detail: "Keep a donor’s details beside their contribution history.",
    meta: "Donor ledger",
    path: "donors",
  },
  {
    name: "Fieldwork",
    icon: "calendar",
    title: "Put a name against the work.",
    detail: "Drive rosters, assigned roles, and the hours recorded afterward.",
    meta: "Drive log",
    path: "drives",
  },
];
function SignalBoard() {
  const [active, setActive] = useState(0);
  const signal = signals[active];
  return (
    <div className="sx-signal-board" data-active={active}>
      <div className="sx-board-top">
        <span>
          <i />
          OPERATIONS / WORKING SAMPLE
        </span>
        <span>ILLUSTRATIVE</span>
      </div>
      <div className="sx-network">
        <div className="sx-network-grid" aria-hidden="true" />
        <svg
          className="sx-network-lines"
          viewBox="0 0 440 270"
          aria-hidden="true"
        >
          <path d="M70 65C70 170 190 70 220 156M370 65C370 170 250 70 220 156M220 235V156" />
          <path
            className="sx-network-current"
            key={active}
            d={
              active === 0
                ? "M70 65C70 170 190 70 220 156"
                : active === 1
                  ? "M370 65C370 170 250 70 220 156"
                  : "M220 235V156"
            }
            pathLength="1"
          />
        </svg>
        <div className="sx-network-hub">
          <Mark />
          <span>SERVEBASE</span>
          <i />
          <i />
        </div>
        {signals.map((item, i) => (
          <button
            type="button"
            key={item.name}
            className={`sx-network-node node-${i}`}
            aria-pressed={active === i}
            onClick={() => setActive(i)}
          >
            <Icon name={item.icon as IconName} size={18} />
            <span>{item.name}</span>
            <i />
          </button>
        ))}
        <span className="sx-network-coordinate">
          PEOPLE / RESOURCES / PARTICIPATION
        </span>
      </div>
      <div className="sx-board-record" key={active}>
        <div className="sx-board-record-label">
          <span>{signal.meta}</span>
          <span>0{active + 1} / 03</span>
        </div>
        <h3>{signal.title}</h3>
        <p>{signal.detail}</p>
        <a href={`#/features/${signal.path}`}>
          Look inside this module
          <Icon name="arrow" size={18} />
        </a>
      </div>
      <div className="sx-board-caption">
        <span>People → participation → a record you can use.</span>
        <Icon name="link" size={13} />
      </div>
    </div>
  );
}
function HomePage() {
  return (
    <>
      <section className="sx-home-hero sx-container" data-scroll-scene>
        <div className="sx-hero-text">
          <Reveal>
            <Label>ServeBase / NGO operating desk</Label>
          </Reveal>
          <h1 aria-label="Good work. Less friction.">
            <span className="sx-hero-line" data-motion-reveal="up">
              Good work.
            </span>
            <span
              className="sx-hero-line sx-hero-outline"
              data-motion-reveal="up"
              data-motion-delay="90"
            >
              Less
            </span>
            <span
              className="sx-hero-line sx-hero-serif"
              data-motion-reveal="up"
              data-motion-delay="180"
            >
              friction<span>.</span>
            </span>
          </h1>
          <Reveal delay={220}>
            <p className="sx-hero-intro">
              The food drive is on Saturday. Who’s available? What’s been
              donated? ServeBase keeps the answers out of scattered registers.
            </p>
            <div className="sx-hero-actions">
              <Action href="#/admin/login">Take a seat at the desk</Action>
              <a className="sx-inline-link" href="#/features">
                See the tools
                <Icon name="arrow" size={16} />
              </a>
            </div>
          </Reveal>
        </div>
        <Reveal className="sx-hero-board" kind="right" delay={160}>
          <div className="sx-board-paper" aria-hidden="true">
            <span>THE WORK BEHIND THE WORK</span>
          </div>
          <SignalBoard />
          <span className="sx-hero-side-note">
            A community service project
            <br />
            at K.R. Mangalam University
          </span>
        </Reveal>
        <div className="sx-hero-bottom">
          <span>
            <i />
            For coordinators, volunteers, and the people backing them.
          </span>
          <a
            href="#workflow"
            onClick={(e) => {
              e.preventDefault();
              smoothScrollToElement(document.getElementById("workflow"), 100);
            }}
          >
            Follow a record <span>↓</span>
          </a>
        </div>
      </section>
      <section className="sx-fact-line">
        <div className="sx-container">
          {[
            { n: "01", v: "4", label: "desks in the workspace" },
            { n: "02", v: "6", label: "report datasets" },
            { n: "03", v: "CSV", label: "when someone needs the figures" },
            { n: "04", v: "Yours", label: "records you can back up" },
          ].map((item, i) => (
            <Reveal key={item.n} delay={i * 70}>
              <span>{item.n}</span>
              <strong>{item.v}</strong>
              <p>{item.label}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <WorkflowStory />
      <section className="sx-section sx-container sx-module-index">
        <Reveal>
          <div className="sx-section-top">
            <Label>01 / Choose a desk</Label>
            <span>The platform, in four parts</span>
          </div>
          <h2>
            Different jobs.
            <br />
            <em>Nothing lost between them.</em>
          </h2>
        </Reveal>
        <div className="sx-module-rows">
          {modules.map((feature, i) => (
            <Reveal key={feature.id} delay={i * 45}>
              <a
                href={`#/features/${feature.id}`}
                className={`sx-module-row module-${feature.id}`}
              >
                <span className="sx-module-number">{feature.number}</span>
                <div>
                  <span className="sx-label">{feature.name}</span>
                  <h3>{feature.headline}</h3>
                </div>
                <p>{feature.description}</p>
                <span className="sx-round-arrow">
                  <Icon name="arrow" size={22} />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="sx-section sx-impact-teaser" data-scroll-scene>
        <div className="sx-container sx-impact-teaser-inner">
          <Reveal>
            <Label>02 / The community context</Label>
            <h2>
              Good records
              <br />
              are a quiet part
              <br />
              of <em>getting there.</em>
            </h2>
            <p>
              The project maps its operational tools to three Sustainable
              Development Goals. Here’s where the connection starts.
            </p>
            <Action href="#/impact" quiet>
              Read the SDG mapping
            </Action>
          </Reveal>
          <Reveal className="sx-goal-orbit" kind="scale">
            <div className="sx-orbit-ring" data-scroll-motion aria-hidden="true">
              <i />
              <i />
              <i />
              <span>COMMUNITY / COORDINATION / CONTINUITY /</span>
            </div>
            <a href="#/impact" className="sx-orbit-goal goal-eleven" data-scroll-motion>
              <span>SDG</span>
              <strong>11</strong>
              <small>Cities & communities</small>
              <Icon name="arrow" size={18} />
            </a>
            <a href="#/impact" className="sx-orbit-goal goal-seventeen" data-scroll-motion>
              <span>SDG</span>
              <strong>17</strong>
              <small>Partnerships</small>
              <Icon name="arrow" size={18} />
            </a>
            <a href="#/impact" className="sx-orbit-goal goal-one" data-scroll-motion>
              <span>SDG / INDIRECT</span>
              <strong>01</strong>
              <small>No poverty</small>
              <Icon name="arrow" size={18} />
            </a>
          </Reveal>
        </div>
      </section>
      <section className="sx-section sx-container sx-under-hood">
        <Reveal>
          <Label>03 / Under the hood</Label>
          <h2>
            A useful interface
            <br />
            needs <em>a legible plan.</em>
          </h2>
          <p>
            See the browser demo as it runs today, then switch to the server
            architecture proposed in the presentation.
          </p>
          <Action href="#/architecture" quiet>
            Unfold the blueprint
          </Action>
        </Reveal>
        <Reveal className="sx-mini-blueprint" kind="right">
          <div className="sx-blueprint-grid" aria-hidden="true" />
          <span className="sx-label">CURRENT EVALUATION BUILD</span>
          {[
            { icon: "layers", title: "Interface", value: "React + TypeScript" },
            {
              icon: "database",
              title: "Record layer",
              value: "Validated browser storage",
            },
            {
              icon: "download",
              title: "Output",
              value: "CSV reports / JSON backup",
            },
          ].map((layer, i) => (
            <div key={layer.title}>
              <span>0{i + 1}</span>
              <Icon name={layer.icon as IconName} size={24} />
              <strong>{layer.title}</strong>
              <small>{layer.value}</small>
              <i />
            </div>
          ))}
          <span className="sx-blueprint-note">
            Shared API and production auth: planned.
          </span>
        </Reveal>
      </section>
      <section className="sx-container sx-home-people">
        <Reveal>
          <Label>04 / Built at university</Label>
          <div>
            <h2>
              Five names
              <br />
              on the <em>project register.</em>
            </h2>
            <a className="sx-inline-link" href="#/team">
              Meet the contributors
              <Icon name="arrow" size={18} />
            </a>
          </div>
          <p>
            {members.map((member, i) => (
              <span key={member.name}>
                {member.name}
                {i < members.length - 1 && <i> / </i>}
              </span>
            ))}
          </p>
        </Reveal>
      </section>
      <EndNote context="home" />
    </>
  );
}
function FeaturesPage() {
  const [selected, setSelected] = useState<FeatureId>("volunteers");
  return (
    <>
      <Intro
        number="01"
        label="The module directory"
        title={
          <>
            Pick a register.
            <br />
            <em>Get into the work.</em>
          </>
        }
        copy="The routine jobs of an NGO don’t need separate spreadsheets. These four modules cover the people, support, activities, and reports behind a community drive."
      >
        <span className="sx-intro-note">
          4 core modules
          <br />
          One evaluation workspace
        </span>
      </Intro>
      <nav
        className="sx-container sx-module-jumps"
        aria-label="Module shortcuts"
      >
        {modules.map((module) => (
          <a key={module.id} href={`#/features/${module.id}`}>
            <Icon name={module.icon} size={16} />
            {module.name}
            <Icon name="arrow" size={14} />
          </a>
        ))}
      </nav>
      <section className="sx-container sx-feature-browser">
        <div className="sx-feature-directory">
          {modules.map((feature, i) => (
            <Reveal key={feature.id} delay={i * 60}>
              <article className={selected === feature.id ? "is-selected" : ""}>
                <div className="sx-directory-top">
                  <span>{feature.number}</span>
                  <Icon name={feature.icon} size={24} />
                  <button
                    type="button"
                    aria-label={`Preview ${feature.name}`}
                    aria-pressed={selected === feature.id}
                    onClick={() => {
                      setSelected(feature.id);
                      if (innerWidth < 701)
                        smoothScrollToElement(
                          document.querySelector(".sx-feature-preview-sticky"),
                          100,
                        );
                    }}
                  >
                    Preview
                    <Icon name="eye" size={14} />
                  </button>
                </div>
                <a href={`#/features/${feature.id}`}>
                  <h2>{feature.headline}</h2>
                  <Icon name="arrow" size={25} />
                </a>
                <p>{feature.description}</p>
                <div className="sx-tags">
                  {feature.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        <div className="sx-feature-preview-sticky">
          <div className="sx-preview-label">
            <Label>Try a small working sample</Label>
            <span>
              0{modules.findIndex((item) => item.id === selected) + 1}
            </span>
            <button
              type="button"
              className="sx-preview-back"
              onClick={() =>
                smoothScrollToElement(
                  document.querySelector(".sx-feature-directory"),
                  95,
                )
              }
            >
              <Icon name="arrow" size={14} />
              Back to modules
            </button>
          </div>
          <div className="sx-live-frame" key={selected}>
            <WorkspacePreview
              initialTab={selected === "reports" ? "exports" : selected}
            />
          </div>
          <p className="sx-preview-note">
            The records here are fictional. Search, change tabs, or download a
            sample CSV; the complete admin workspace opens separately.
          </p>
        </div>
      </section>
      <EndNote context="features" />
    </>
  );
}
function FeaturePage({ feature }: { feature: FeatureContent }) {
  return (
    <>
      <section className="sx-container sx-feature-hero">
        <div className="sx-breadcrumb">
          <a href="#/features">Module directory</a>
          <Icon name="chevron" size={13} />
          <span>{feature.name}</span>
        </div>
        <div className="sx-feature-hero-grid">
          <Reveal>
            <div className="sx-page-number">
              <span>{feature.number}</span>
              <Label>{feature.headline}</Label>
            </div>
            <h1>
              {feature.title}
              <em>.</em>
            </h1>
            <p>{feature.detail}</p>
            <div className="sx-tags">
              {feature.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <Action href="#/admin/login">
              Open the{" "}
              {feature.id === "reports"
                ? "reporting desk"
                : feature.name.toLowerCase() + " register"}
            </Action>
          </Reveal>
          <Reveal className="sx-feature-live" kind="right" delay={100}>
            <div className="sx-preview-label">
              <Label>{feature.name} / sample view</Label>
              <span>INTERACTIVE</span>
            </div>
            <div className="sx-live-frame">
              <WorkspacePreview
                initialTab={feature.id === "reports" ? "exports" : feature.id}
              />
            </div>
          </Reveal>
        </div>
      </section>
      <section className="sx-section sx-container sx-feature-steps">
        <Reveal>
          <Label>The everyday sequence</Label>
          <h2>
            {feature.id === "volunteers"
              ? "From an introduction to an assignment."
              : feature.id === "donors"
                ? "Follow the contribution, not a paper trail."
                : feature.id === "drives"
                  ? "Before the drive. After the turnout."
                  : "A review starts with the right rows."}
          </h2>
        </Reveal>
        <div>
          {feature.steps.map((step, i) => (
            <Reveal key={step[0]} delay={i * 100}>
              <span className="sx-step-counter">0{i + 1}</span>
              <h3>{step[0]}</h3>
              <p>{step[1]}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="sx-container sx-section sx-data-dictionary">
        <Reveal>
          <Label>What goes in the record</Label>
          <h2>
            A closer look
            <br />
            at <em>the fields.</em>
          </h2>
          <p>
            {feature.id === "volunteers"
              ? "Keep the useful details where the next coordinator can find them."
              : feature.id === "donors"
                ? "Distinguish the relationship from the transaction, then link them by reference."
                : feature.id === "drives"
                  ? "Scheduling and participation have separate records, joined by the drive."
                  : "The export keeps the scope you select and the relationships it needs."}
          </p>
        </Reveal>
        <div>
          {feature.fields.map((field, i) => (
            <Reveal key={field[0]} delay={i * 30}>
              <div className="sx-dictionary-row">
                <span>0{i + 1}</span>
                <div>
                  <h3>{field[0]}</h3>
                  <code>{field[1]}</code>
                </div>
                <p>{field[2]}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="sx-container sx-next-modules">
        <Label>Elsewhere in the workspace</Label>
        <div>
          {modules
            .filter((item) => item.id !== feature.id)
            .map((item) => (
              <a key={item.id} href={`#/features/${item.id}`}>
                <span>{item.number}</span>
                {item.headline}
                <Icon name="arrow" size={18} />
              </a>
            ))}
        </div>
      </section>
      <EndNote context={feature.id} />
    </>
  );
}
const goals = [
  {
    id: "11",
    name: "Sustainable Cities & Communities",
    caption: "Coordination at a local scale",
    body: "A neighborhood initiative still needs the basics: the right people, a place to meet, and a record of who took part. ServeBase gives those details a shared structure.",
    tools: [
      "Search skills and availability",
      "Plan a drive and its capacity",
      "Record roles and attendance",
    ],
    foot: "Project alignment: organizing people and resource allocation for local initiatives.",
    icon: "building",
  },
  {
    id: "17",
    name: "Partnerships for the Goals",
    caption: "Keep the supporter in the picture",
    body: "A donor, an institution, and a volunteer may contribute in different ways. Their contact records and histories make it easier to see who supported the work and how.",
    tools: [
      "Maintain institutional donor contacts",
      "Link contributions to supporters",
      "Retain volunteer participation histories",
    ],
    foot: "Project alignment: collaboration between NGOs, volunteers, and donors.",
    icon: "link",
  },
  {
    id: "01",
    name: "No Poverty",
    caption: "An indirect operational contribution",
    body: "The platform does not measure poverty reduction. Its role is narrower: reduce the time spent reconstructing records so NGOs can coordinate outreach with a clearer view of available support.",
    tools: [
      "Review monetary and in-kind entries",
      "Track work across community drives",
      "Prepare records for institutional review",
    ],
    foot: "Indirect alignment, as described in the Community Service presentation.",
    icon: "heart",
  },
];
function ImpactPage() {
  const [active, setActive] = useState(0);
  const goal = goals[active];
  return (
    <>
      <Intro
        number="02"
        label="SDG impact / project alignment"
        title={
          <>
            The goal is outside
            <br />
            <em>the software.</em>
          </>
        }
        copy="The platform handles administration. The community work happens in the field. This is how the project relates its tools to the UN Sustainable Development Goals."
      >
        <span className="sx-intro-note">
          SDG 11 · SDG 17
          <br />
          SDG 1 — indirect
        </span>
      </Intro>
      <section className="sx-container sx-section sx-impact-workbench">
        <div
          className="sx-goal-selector"
          role="group"
          aria-label="Sustainable Development Goals"
        >
          {goals.map((item, i) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={active === i}
              onClick={() => setActive(i)}
            >
              <span>{item.id}</span>
              <strong>{item.name}</strong>
              <Icon name={item.icon as IconName} size={21} />
              <span className="sx-goal-selector-line" />
            </button>
          ))}
        </div>
        <div className="sx-impact-reading" key={goal.id} aria-live="polite">
          <div className="sx-impact-numeral" aria-hidden="true">
            {goal.id}
            <span>SDG</span>
          </div>
          <div>
            <Label>{goal.caption}</Label>
            <h2>{goal.name}</h2>
            <p>{goal.body}</p>
            <ul>
              {goal.tools.map((tool) => (
                <li key={tool}>
                  <Icon name="check" size={15} />
                  {tool}
                </li>
              ))}
            </ul>
            <small>{goal.foot}</small>
            <a className="sx-inline-link" href="#/features">
              Inspect the relevant tools
              <Icon name="arrow" size={17} />
            </a>
          </div>
        </div>
      </section>
      <section className="sx-container sx-impact-note">
        <Reveal>
          <span>What this page claims</span>
          <h2>
            An alignment.
            <br />
            <em>A starting point for evaluation.</em>
          </h2>
          <p>
            These links follow the supplied project presentation. They describe
            the intended use of the system; they are not independently measured
            impact results or a UN endorsement.
          </p>
        </Reveal>
      </section>
      <EndNote context="impact" />
    </>
  );
}
const entities = [
  {
    name: "Volunteers",
    icon: "users",
    fields: [
      "id: volunteer reference",
      "name · email · phone",
      "skills[] · availability · status",
    ],
    relation: "One person can take part in many drives.",
    detail:
      "Inactive profiles retain previous assignments, so leaving the active directory does not erase service history.",
  },
  {
    name: "Donors",
    icon: "heart",
    fields: [
      "id: donor reference",
      "name · type · email · phone",
      "address · joinedOn · notes",
    ],
    relation: "A supporter can have many contribution entries.",
    detail:
      "The donor profile carries contact information; amounts and goods belong in the linked ledger.",
  },
  {
    name: "Contributions",
    icon: "database",
    fields: [
      "id · donorId → Donors",
      "type · amount · date",
      "category · notes",
    ],
    relation: "Every contribution points to one donor.",
    detail:
      "Monetary totals exclude optional in-kind valuations. The type remains visible in reports.",
  },
  {
    name: "Drives",
    icon: "calendar",
    fields: [
      "id: drive reference",
      "date · location · capacity",
      "status · SDG alignment",
    ],
    relation: "A drive has a roster of participation records.",
    detail:
      "Capacity and duplicate registration checks run before an assignment is added.",
  },
  {
    name: "Participation",
    icon: "check",
    fields: [
      "id · volunteerId → Volunteers",
      "driveId → Drives · role",
      "attendance · hours · notes",
    ],
    relation: "The joining record between a person and a drive.",
    detail:
      "Attendance and hours are recorded here and appear in both histories.",
  },
];
function ArchitecturePage() {
  const [mode, setMode] = useState<"local" | "planned">("local");
  const [entity, setEntity] = useState(0);
  const layers =
    mode === "local"
      ? [
          {
            icon: "layers",
            title: "React interface",
            sub: "What you use",
            copy: "Public pages, admin modules, forms, and route navigation.",
          },
          {
            icon: "database",
            title: "Browser workspace",
            sub: "Where the demo saves",
            copy: "Versioned local records, field checks, and linked identifiers.",
          },
          {
            icon: "download",
            title: "Portable files",
            sub: "What you take away",
            copy: "Filtered CSV reports and a complete JSON backup.",
          },
        ]
      : [
          {
            icon: "layers",
            title: "React + Tailwind",
            sub: "Proposed frontend",
            copy: "The interface architecture described in the project presentation.",
          },
          {
            icon: "code",
            title: "Node + Express",
            sub: "Planned API",
            copy: "A REST gateway for requests, validation, and shared access.",
          },
          {
            icon: "database",
            title: "MySQL",
            sub: "Proposed database",
            copy: "Relational records; Firebase is listed as an alternative.",
          },
          {
            icon: "download",
            title: "JSON → CSV",
            sub: "Planned output layer",
            copy: "A server subsystem for portable report streams.",
          },
        ];
  const current = entities[entity];
  return (
    <>
      <Intro
        number="03"
        label="System architecture"
        title={
          <>
            Open the cover.
            <br />
            <em>Trace a record.</em>
          </>
        }
        copy="The live evaluation build saves in your browser. The presentation proposes a shared API and database. Switch views to see where the two differ."
      >
        <span className="sx-intro-note">
          Implementation / proposal
          <br />
          Clearly marked below
        </span>
      </Intro>
      <section className="sx-container sx-system-workbench">
        <div
          className="sx-mode-control"
          role="group"
          aria-label="Architecture mode"
        >
          <span>VIEW</span>
          <button
            type="button"
            aria-pressed={mode === "local"}
            onClick={() => setMode("local")}
          >
            Current demo
            <Icon name="layers" size={15} />
          </button>
          <button
            type="button"
            aria-pressed={mode === "planned"}
            onClick={() => setMode("planned")}
          >
            Planned backend
            <Icon name="code" size={15} />
          </button>
        </div>
        <div className="sx-system-board" key={mode}>
          <div className="sx-blueprint-grid" aria-hidden="true" />
          <div className="sx-system-board-head">
            <Label>
              {mode === "local"
                ? "RUNNING IN THIS BUILD"
                : "PROPOSED IN THE PRESENTATION"}
            </Label>
            <span>PLATE / {mode === "local" ? "A" : "B"}</span>
          </div>
          <div className={`sx-system-layers layers-${layers.length}`}>
            {layers.map((layer, i) => (
              <Reveal key={layer.title} delay={i * 100}>
                <div className="sx-system-layer">
                  <span className="sx-system-layer-num">0{i + 1}</span>
                  <Icon name={layer.icon as IconName} size={28} />
                  <span className="sx-label">{layer.sub}</span>
                  <h2>{layer.title}</h2>
                  <p>{layer.copy}</p>
                  {i < layers.length - 1 && (
                    <span className="sx-system-connector" aria-hidden="true">
                      <Icon name="arrow" size={18} />
                    </span>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
          <p className="sx-system-boundary">
            <Icon name="shield" size={17} />
            {mode === "local"
              ? "Demo sign-in is open. A real authentication service, shared database, and multi-user permissions are not connected."
              : "These backend services are planned integrations. Switching this view does not connect or deploy them."}
          </p>
        </div>
      </section>
      <section className="sx-container sx-section sx-entity-section">
        <Reveal>
          <Label>How the records relate</Label>
          <h2>
            Five record types.
            <br />
            <em>Specific responsibilities.</em>
          </h2>
        </Reveal>
        <div className="sx-entity-workbench">
          <div
            className="sx-entity-nav"
            role="group"
            aria-label="Data entities"
          >
            {entities.map((item, i) => (
              <button
                key={item.name}
                type="button"
                aria-pressed={entity === i}
                onClick={() => setEntity(i)}
              >
                <span>0{i + 1}</span>
                <Icon name={item.icon as IconName} size={18} />
                {item.name}
                <Icon name="chevron" size={15} />
              </button>
            ))}
          </div>
          <div className="sx-entity-file" key={entity} aria-live="polite">
            <div className="sx-entity-file-head">
              <span>{current.name.toLowerCase()}.record</span>
              <Icon name={current.icon as IconName} size={20} />
            </div>
            <div className="sx-entity-code">
              {current.fields.map((field, i) => (
                <div key={field}>
                  <span>{i + 1}</span>
                  <code>{field}</code>
                </div>
              ))}
            </div>
            <h3>
              <Icon name="link" size={17} />
              {current.relation}
            </h3>
            <p>{current.detail}</p>
          </div>
        </div>
      </section>
      <section className="sx-container sx-architecture-rules">
        {[
          {
            n: "A",
            t: "Check the references",
            p: "An imported backup must contain valid identifiers and relationships before it replaces the workspace.",
          },
          {
            n: "B",
            t: "Keep the history intact",
            p: "Deletion guards prevent removing profiles or drives that still have contribution or participation records.",
          },
          {
            n: "C",
            t: "Let the records leave",
            p: "CSV exports and JSON backup files keep data usable outside this interface.",
          },
        ].map((rule, i) => (
          <Reveal key={rule.n} delay={i * 90}>
            <span>{rule.n}</span>
            <h3>{rule.t}</h3>
            <p>{rule.p}</p>
          </Reveal>
        ))}
      </section>
      <EndNote context="architecture" />
    </>
  );
}
function TeamPage() {
  const [active, setActive] = useState(0);
  const member = members[active];
  return (
    <>
      <Intro
        number="04"
        label="The project register"
        title={
          <>
            A group project.
            <br />
            <em>With names attached.</em>
          </>
        }
        copy="Five contributors developed ServeBase for the Second Year Community Service evaluation at K.R. Mangalam University. The submitted presentation credits the following team."
      >
        <span className="sx-intro-note">
          Contributors / 05
          <br />
          Academic software prototype
        </span>
      </Intro>
      <section className="sx-container sx-section sx-team-register">
        <div className="sx-person-record" key={active} aria-live="polite">
          <div className="sx-person-record-top">
            <Mark />
            <span>CONTRIBUTOR FILE</span>
            <span>0{active + 1}</span>
          </div>
          <div className="sx-person-monogram" aria-hidden="true">
            <span>{member.initials}</span>
            <i />
            <i />
            <i />
          </div>
          <h2>{member.name}</h2>
          <div className="sx-person-id">
            <span>University roll number</span>
            <strong>{member.roll}</strong>
          </div>
          <p>
            {projectFacts.university}
            <br />
            Community Service Project
          </p>
        </div>
        <div
          className="sx-team-list"
          role="group"
          aria-label="Project contributors"
        >
          {members.map((person, i) => (
            <Reveal key={person.name} delay={i * 60}>
              <button
                type="button"
                aria-pressed={active === i}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setActive(i);
                }}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
              >
                <span>0{i + 1}</span>
                <strong>{person.name}</strong>
                <span className="sx-team-initials">{person.initials}</span>
                <Icon name="arrow" size={25} />
              </button>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="sx-container sx-team-brief">
        <Reveal>
          <Label>The brief they worked from</Label>
          <h2>
            Replace the scattered register.
            <br />
            <em>Keep the day-to-day detail.</em>
          </h2>
          <p>
            The project focuses on volunteer profiles, donor contacts,
            contribution histories, community drives, and CSV output. Those
            everyday records set the scope of the prototype.
          </p>
          <a className="sx-inline-link" href="#/features">
            Walk through the result
            <Icon name="arrow" size={18} />
          </a>
        </Reveal>
      </section>
      <EndNote context="team" />
    </>
  );
}
function GuidePage() {
  const sections = [
    {
      t: "Enter the demonstration",
      p: "Use Open workspace, then Sign in to ServeBase. Credentials are optional for this evaluation build. Exiting the demo clears the entry flag in the current browser tab.",
    },
    {
      t: "Create the base records first",
      p: "Add volunteer and donor profiles before registering participation or recording contributions. The links between records are what keep histories useful.",
    },
    {
      t: "Finish a drive’s register",
      p: "Set the drive’s location, date, and capacity. Assign active volunteers and their roles. After the event, update attendance and actual service hours.",
    },
    {
      t: "Check the scope of an export",
      p: "Select one of six datasets in Reports & Exports. Apply the date range, inspect the preview, and download every matching row as a CSV file.",
    },
    {
      t: "Take a backup before moving",
      p: "The demo saves in this browser. A JSON backup preserves the whole workspace. Restore validates the structure and links before replacing existing records.",
    },
    {
      t: "Know what is still proposed",
      p: "A separate volunteer fieldbook is available in this local demo. Production authentication, role-based server access, shared storage, email/SMS delivery, payments, and a donor portal remain future integrations.",
    },
  ];
  return (
    <>
      <Intro
        number="05"
        label="A short field guide"
        title={
          <>
            Start with a profile.
            <br />
            <em>Leave with a backup.</em>
          </>
        }
        copy="A practical route through the demo, from the first volunteer entry to the report someone needs for evaluation."
      >
        <button
          type="button"
          className="sx-text-download"
          onClick={() => downloadSampleCsv("volunteers")}
        >
          Take a sample CSV
          <Icon name="download" size={18} />
        </button>
      </Intro>
      <section className="sx-container sx-section sx-guide-layout">
        <aside>
          <span>BEFORE YOU BEGIN</span>
          <p>
            No credentials are required.
            <br />
            Your changes stay in this browser.
          </p>
          <a href="#/architecture">
            Read the technical boundary
            <Icon name="arrow" size={16} />
          </a>
        </aside>
        <div>
          {sections.map((section, i) => (
            <Reveal key={section.t} delay={i * 35}>
              <article className="sx-guide-entry">
                <span>0{i + 1}</span>
                <div>
                  <h2>{section.t}</h2>
                  <p>{section.p}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
      <EndNote context="guide" />
    </>
  );
}
const endings: Record<
  string,
  { title: ReactNode; body: string; action: string }
> = {
  home: {
    title: (
      <>
        The next drive
        <br />
        needs <em>a working desk.</em>
      </>
    ),
    body: "Try the complete local workspace. Add a profile, build a roster, and see where the record goes.",
    action: "Open the field desk",
  },
  features: {
    title: (
      <>
        Enough reading.
        <br />
        <em>Try a real workflow.</em>
      </>
    ),
    body: "The evaluation workspace lets you edit records, register participation, and download the results.",
    action: "Enter the demonstration",
  },
  volunteers: {
    title: (
      <>
        There’s a person
        <br />
        behind <em>every profile.</em>
      </>
    ),
    body: "Add the practical details that help a coordinator make the next assignment.",
    action: "Visit the volunteer desk",
  },
  donors: {
    title: (
      <>
        Keep the receipt.
        <br />
        <em>Remember the supporter.</em>
      </>
    ),
    body: "Explore donor profiles and the monetary or in-kind contributions linked to them.",
    action: "Inspect the donor ledger",
  },
  drives: {
    title: (
      <>
        Set a date.
        <br />
        <em>Build the roster.</em>
      </>
    ),
    body: "Create a drive, assign a role, and record the attendance after the day is done.",
    action: "Plan a demonstration drive",
  },
  reports: {
    title: (
      <>
        The review is coming.
        <br />
        <em>Take the right records.</em>
      </>
    ),
    body: "Open the report workspace to filter a dataset or save a full backup.",
    action: "Go to the reporting desk",
  },
  impact: {
    title: (
      <>
        From a goal
        <br />
        to <em>the next task.</em>
      </>
    ),
    body: "Explore the administrative tools the project proposes for day-to-day coordination.",
    action: "Try those tools",
  },
  architecture: {
    title: (
      <>
        The diagram is one view.
        <br />
        <em>The workspace is another.</em>
      </>
    ),
    body: "Test the forms and linked histories that run in the current browser build.",
    action: "Inspect the running demo",
  },
  team: {
    title: (
      <>
        A project is best
        <br />
        understood <em>by using it.</em>
      </>
    ),
    body: "Step into the team’s evaluation workspace and trace a record for yourself.",
    action: "See what they built",
  },
  guide: {
    title: (
      <>
        You have the route.
        <br />
        <em>Take the first step.</em>
      </>
    ),
    body: "The sample workspace is ready. No account setup is needed for this phase.",
    action: "Begin the evaluation",
  },
};
function EndNote({ context }: { context: string }) {
  const note = endings[context] || endings.home;
  return (
    <section className="sx-endnote sx-container" data-scroll-scene>
      <Reveal>
        <div className="sx-endnote-top">
          <Label>Desk is open / Evaluation build</Label>
          <span>NO CREDENTIALS REQUIRED</span>
        </div>
        <h2>{note.title}</h2>
        <div className="sx-endnote-bottom">
          <p>{note.body}</p>
          <Action href="#/admin/login">{note.action}</Action>
        </div>
        <span className="sx-endnote-stamp" data-scroll-motion aria-hidden="true">
          SB / 01
        </span>
      </Reveal>
    </section>
  );
}
function Footer() {
  return (
    <footer className="sx-footer sx-container">
      <div className="sx-footer-top">
        <a href="#/" className="sx-footer-brand">
          <Mark />
          ServeBase<span>NGO volunteer & donor management</span>
        </a>
        <div>
          <a href="#/documentation">
            Field guide
            <Icon name="arrow" size={14} />
          </a>
          <a href="#/team">
            Project register
            <Icon name="arrow" size={14} />
          </a>
          <a href="#/admin/login">
            Admin access
            <Icon name="arrow" size={14} />
          </a>
          <a href="#/volunteer/login">
            Volunteer fieldbook
            <Icon name="arrow" size={14} />
          </a>
          <a href="#/terms">
            Terms & Conditions
            <Icon name="arrow" size={14} />
          </a>
        </div>
      </div>
      <div className="sx-footer-bottom">
        <p>
          {projectFacts.university}
          <br />
          {projectFacts.credits}
        </p>
        <p>{projectFacts.teamline}</p>
        <span>
          {projectFacts.notice}
          <br />
          v1.0 / Built for evaluation
        </span>
      </div>
    </footer>
  );
}
