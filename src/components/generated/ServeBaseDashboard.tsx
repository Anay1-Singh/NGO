import { useEffect, useRef, useState } from "react";
import { Icon } from "./ServeBaseIcons";
import type { IconName } from "./ServeBaseIcons";
import { ThemeToggle } from "./ServeBaseTheme";
import type { Theme } from "./ServeBaseTheme";
import { useWorkspace } from "./ServeBaseStore";
import { PeoplePage } from "./ServeBasePeople";
import { DrivesPage } from "./ServeBaseDrives";
import { ConsoleGuide } from "./ServeBaseConsoleGuide";
import {
  OverviewPage,
  ReportsPage,
  SettingsPage,
} from "./ServeBaseWorkspacePages";
import "./ServeBaseDashboard.css";

const navigation: {
  id: string;
  label: string;
  icon: IconName;
  group?: string;
}[] = [
  { id: "overview", label: "Overview", icon: "layers", group: "WORKSPACE" },
  { id: "volunteers", label: "Volunteers", icon: "users" },
  { id: "donors", label: "Donor directory", icon: "heart" },
  { id: "donations", label: "Contributions", icon: "database" },
  {
    id: "drives",
    label: "Community drives",
    icon: "calendar",
    group: "OPERATIONS",
  },
  { id: "participation", label: "Participation", icon: "check" },
  {
    id: "reports",
    label: "Reports & exports",
    icon: "download",
    group: "ADMINISTRATION",
  },
  { id: "settings", label: "Workspace settings", icon: "code" },
];
type Props = {
  route: string;
  theme: Theme;
  toggleTheme: () => void;
  onLogout: () => void;
};
export function AdminDashboard({ route, theme, toggleTheme, onLogout }: Props) {
  const { db, storageError } = useWorkspace();
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const activityDialog = useRef<HTMLDialogElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const navToggle = useRef<HTMLButtonElement>(null);
  const path = route.replace(/^#\/admin\//, "").split("?")[0];
  const section = navigation.some((item) => item.id === path)
    ? path
    : "overview";
  const params = new URLSearchParams(route.split("?")[1] || "");
  const current = navigation.find((item) => item.id === section)!;
  const searchTerm = query.trim().toLowerCase();
  const results =
    searchTerm.length < 2
      ? []
      : [
          ...db.volunteers
            .filter((item) =>
              `${item.name} ${item.email} ${item.id} ${item.skills.join(" ")}`
                .toLowerCase()
                .includes(searchTerm),
            )
            .map((item) => ({
              id: item.id,
              name: item.name,
              detail: `Volunteer · ${item.email}`,
              to: `volunteers?q=${encodeURIComponent(item.name)}`,
              icon: "users" as IconName,
            })),
          ...db.donors
            .filter((item) =>
              `${item.name} ${item.email} ${item.id}`
                .toLowerCase()
                .includes(searchTerm),
            )
            .map((item) => ({
              id: item.id,
              name: item.name,
              detail: `Donor · ${item.type}`,
              to: `donors?q=${encodeURIComponent(item.name)}`,
              icon: "heart" as IconName,
            })),
          ...db.drives
            .filter((item) =>
              `${item.name} ${item.location} ${item.id}`
                .toLowerCase()
                .includes(searchTerm),
            )
            .map((item) => ({
              id: item.id,
              name: item.name,
              detail: `Drive · ${item.location}`,
              to: `drives?q=${encodeURIComponent(item.name)}`,
              icon: "calendar" as IconName,
            })),
        ].slice(0, 8);
  useEffect(() => {
    setMobileNav(false);
    setQuery("");
    setSearchFocus(false);
    document.title = `${current.label} — ServeBase Admin`;
  }, [route, current.label]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === "Escape") {
        setMobileNav(false);
        setSearchFocus(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!mobileNav) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      sidebar.current
        ?.querySelector<HTMLElement>('a[aria-current="page"]')
        ?.focus({ preventScroll: true });
    });
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), [tabindex="0"]',
        ) || [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const wideScreen = window.matchMedia("(min-width: 781px)");
    const dismissOnResize = () => {
      if (wideScreen.matches) setMobileNav(false);
    };
    document.addEventListener("keydown", containFocus);
    wideScreen.addEventListener("change", dismissOnResize);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", containFocus);
      wideScreen.removeEventListener("change", dismissOnResize);
      if (navToggle.current?.isConnected)
        navToggle.current.focus({ preventScroll: true });
    };
  }, [mobileNav]);
  const counts: Record<string, number> = {
    volunteers: db.volunteers.length,
    donors: db.donors.length,
    drives: db.drives.filter(
      (d) => d.status === "Upcoming" || d.status === "Ongoing",
    ).length,
  };
  return (
    <div className="db db-console">
      <a
        className="db-skip"
        href="#db-main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("db-main")?.focus();
        }}
      >
        Skip to workspace
      </a>
      {mobileNav && (
        <button
          className="db-nav-overlay"
          aria-label="Close sidebar"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        ref={sidebar}
        id="db-sidebar"
        className={`db-sidebar${mobileNav ? " is-open" : ""}`}
        aria-label="Admin sidebar"
        role={mobileNav ? "dialog" : undefined}
        aria-modal={mobileNav ? true : undefined}
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("a[href]")
          )
            setMobileNav(false);
        }}
      >
        <div className="db-sidebar-brand">
          <a className="db-brand" href="#/admin/overview">
            <span className="db-mark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            ServeBase<span>.</span>
          </a>
          <button
            className="db-icon-button db-sidebar-close"
            aria-label="Close sidebar"
            onClick={() => setMobileNav(false)}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="db-rail-caption">
          <span>OPERATIONS DESK</span>
          <b>01—08</b>
        </div>
        <a className="db-organization" href="#/admin/settings">
          <span className="db-org-symbol">
            <Icon name="building" size={18} />
          </span>
          <span>
            <strong>{db.settings.organizationName}</strong>
            <small>Community service · 2026</small>
          </span>
          <Icon name="chevron" size={13} />
        </a>
        <nav aria-label="Admin navigation">
          {navigation.map((item) => (
            <div key={item.id}>
              {item.group && <div className="db-nav-group">{item.group}</div>}
              <a
                href={`#/admin/${item.id}`}
                className={section === item.id ? "is-active" : ""}
                aria-current={section === item.id ? "page" : undefined}
              >
                <Icon name={item.icon} size={17} />
                <span>{item.label}</span>
                {counts[item.id] !== undefined && <b>{counts[item.id]}</b>}
              </a>
            </div>
          ))}
        </nav>
        <div className="db-sidebar-bottom">
          <div className="db-demo-note">
            <span />
            <strong>Local demo workspace</strong>
            <p>
              Try the tools. Add a record. Everything stays in this browser.
            </p>
          </div>
          <div className="db-admin-profile">
            <span className="db-avatar">
              {db.settings.adminName
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              <strong>{db.settings.adminName}</strong>
              <small>Workspace administrator</small>
            </span>
            <button
              className="db-icon-button"
              onClick={onLogout}
              aria-label="Exit demo workspace"
              title="Exit demo workspace"
            >
              <Icon name="arrow" size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="db-workspace">
        <header className="db-topbar">
          <div className="db-breadcrumb">
            <button
              ref={navToggle}
              className="db-icon-button db-nav-toggle"
              aria-label="Open sidebar"
              aria-expanded={mobileNav}
              aria-controls="db-sidebar"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Icon name="menu" size={20} />
            </button>
            <span className="db-office-label">
              <i />
              OPERATIONS
            </span>
            <Icon name="chevron" size={12} />
            <strong>{current.label}</strong>
          </div>
          <div className="db-topbar-actions">
            <div className="db-global-search">
              <Icon name="search" size={15} />
              <input
                ref={searchInput}
                aria-label="Search workspace"
                type="search"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onFocus={() => setSearchFocus(true)}
                onBlur={() =>
                  window.setTimeout(() => setSearchFocus(false), 150)
                }
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchFocus(true);
                }}
                placeholder="Find a person or drive…"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && results[0])
                    window.location.hash = `/admin/${results[0].to}`;
                }}
              />
              <kbd>
                {/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K"}
              </kbd>
              {searchFocus && searchTerm.length >= 2 && (
                <div
                  className="db-search-results"
                  role="region"
                  aria-label="Workspace search results"
                >
                  <div className="db-search-caption">
                    {results.length
                      ? "MATCHING RECORDS"
                      : "NO MATCHING RECORDS"}
                  </div>
                  {results.map((result) => (
                    <a
                      key={result.id}
                      href={`#/admin/${result.to}`}
                      onClick={() => setSearchFocus(false)}
                    >
                      <Icon name={result.icon} size={17} />
                      <span>
                        <strong>{result.name}</strong>
                        <small>{result.detail}</small>
                      </span>
                      <Icon name="chevron" size={12} />
                    </a>
                  ))}
                  {!results.length && (
                    <p>Try a volunteer, donor, skill, or drive name.</p>
                  )}
                </div>
              )}
            </div>
            <ConsoleGuide section={section} />
            <button
              className="db-icon-button db-activity-toggle"
              aria-label="Open activity log"
              title="Activity log"
              onClick={() => activityDialog.current?.showModal()}
            >
              <Icon name="calendar" size={18} />
            </button>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <a
              className="db-top-avatar"
              href="#/admin/settings"
              aria-label="Administrator settings"
            >
              {db.settings.adminName
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </a>
          </div>
        </header>
        {storageError && (
          <div className="db-storage-warning" role="alert">
            {storageError} Export a backup to keep your changes.
          </div>
        )}
        <main key={section} id="db-main" className="db-main" tabIndex={-1}>
          {section === "overview" && <OverviewPage />}
          {(section === "volunteers" ||
            section === "donors" ||
            section === "donations") && (
            <PeoplePage
              key={section}
              section={section}
              initialSearch={params.get("q") || ""}
              openCreate={params.get("action") === "add"}
            />
          )}
          {(section === "drives" || section === "participation") && (
            <DrivesPage
              key={section}
              section={section}
              initialSearch={params.get("q") || ""}
              openCreate={params.get("action") === "add"}
            />
          )}
          {section === "reports" && (
            <ReportsPage
              initialDataset={params.get("dataset") || "volunteers"}
            />
          )}
          {section === "settings" && (
            <SettingsPage initialTab={params.get("tab") || "profile"} />
          )}
        </main>
        <footer className="db-footer">
          <span>
            <i />
            All records stored locally in this browser
          </span>
          <a href="#home">
            ServeBase v1.0 · Academic prototype
            <Icon name="arrow" size={12} />
          </a>
        </footer>
      </div>
      <dialog
        ref={activityDialog}
        className="db-modal db-activity-modal"
        aria-labelledby="db-activity-title"
      >
        <div className="db-modal-head">
          <div>
            <span className="db-eyebrow">WORKSPACE HISTORY</span>
            <h2 id="db-activity-title">Activity log</h2>
          </div>
          <button
            className="db-icon-button"
            aria-label="Close activity log"
            onClick={() => activityDialog.current?.close()}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="db-modal-body">
          <p className="db-muted">
            A local record of changes and exports in this demo workspace.
          </p>
          <div className="db-activity-list">
            {db.activities.length ? (
              db.activities.map((activity) => (
                <div key={activity.id}>
                  <span className="db-activity-dot" />
                  <div>
                    <strong>{activity.title}</strong>
                    <p>{activity.detail}</p>
                    <small>
                      {new Date(activity.at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <div className="db-empty">
                Your workspace activity will appear here.
              </div>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
