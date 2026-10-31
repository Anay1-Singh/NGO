import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { Icon } from "./ServeBaseIcons";
import type { IconName } from "./ServeBaseIcons";

type Module = "volunteers" | "donors" | "drives";
type PreviewTab = Module | "exports";
type SampleRecord = {
  id: string;
  initials: string;
  name: string;
  detail: string;
  status: string;
  color: string;
};
const sampleRecords: Record<Module, SampleRecord[]> = {
  volunteers: [
    {
      id: "VOL-001",
      initials: "AK",
      name: "Aarav Kumar",
      detail: "Community outreach",
      status: "Weekends",
      color: "teal",
    },
    {
      id: "VOL-002",
      initials: "PS",
      name: "Priya Singh",
      detail: "Education & mentoring",
      status: "Weekdays",
      color: "slate",
    },
    {
      id: "VOL-003",
      initials: "RM",
      name: "Rohan Mehta",
      detail: "Event coordination",
      status: "Weekends",
      color: "sand",
    },
  ],
  donors: [
    {
      id: "DNR-001",
      initials: "AF",
      name: "Asha Foundation",
      detail: "Learning materials · 12 Oct",
      status: "Institutional",
      color: "teal",
    },
    {
      id: "DNR-002",
      initials: "NV",
      name: "Neha Verma",
      detail: "Food supplies · 16 Oct",
      status: "Individual",
      color: "slate",
    },
    {
      id: "DNR-003",
      initials: "GT",
      name: "Greenfield Trust",
      detail: "Community kits · 18 Oct",
      status: "Institutional",
      color: "sand",
    },
  ],
  drives: [
    {
      id: "DRV-001",
      initials: "24",
      name: "Community food drive",
      detail: "24 Oct · Distribution",
      status: "Upcoming",
      color: "teal",
    },
    {
      id: "DRV-002",
      initials: "18",
      name: "Learning together",
      detail: "18 Oct · Education",
      status: "Completed",
      color: "slate",
    },
    {
      id: "DRV-003",
      initials: "12",
      name: "Neighbourhood clean-up",
      detail: "12 Oct · Environment",
      status: "Completed",
      color: "sand",
    },
  ],
};
const tabs: { id: PreviewTab; label: string; icon: IconName }[] = [
  { id: "volunteers", label: "Volunteers", icon: "users" },
  { id: "donors", label: "Donors", icon: "heart" },
  { id: "drives", label: "Drives", icon: "calendar" },
  { id: "exports", label: "Exports", icon: "download" },
];
const headings: Record<Module, [string, string]> = {
  volunteers: ["VOLUNTEER / SKILL", "AVAILABILITY"],
  donors: ["DONOR / CONTRIBUTION", "TYPE"],
  drives: ["COMMUNITY DRIVE", "STATUS"],
};

export function downloadSampleCsv(module: Module) {
  const csvRows = [
    [
      "record_id",
      "name",
      "description",
      module === "volunteers"
        ? "availability"
        : module === "donors"
          ? "donor_type"
          : "status",
    ],
    ...sampleRecords[module].map((r) => [r.id, r.name, r.detail, r.status]),
  ];
  const csv =
    csvRows
      .map((row) =>
        row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n") + "\r\n";
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `servebase-sample-${module}.csv`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useActiveSection() {
  const [active, setActive] = useState("");
  useEffect(() => {
    let frame = 0;
    const sections = ["features", "impact", "architecture", "team"]
      .map((id) => document.getElementById(id))
      .filter((s): s is HTMLElement => !!s);
    const update = () => {
      frame = 0;
      const marker = Math.min(180, window.innerHeight * 0.25);
      let current = "";
      for (const section of sections)
        if (section.getBoundingClientRect().top <= marker) current = section.id;
      if (
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 3
      )
        current = "team";
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return active;
}

export function WorkspacePreview({
  initialTab = "volunteers",
}: { initialTab?: PreviewTab } = {}) {
  const [tab, setTab] = useState<PreviewTab>(initialTab);
  const [query, setQuery] = useState("");
  const [exportModule, setExportModule] = useState<Module>("volunteers");
  const [exported, setExported] = useState(false);
  const records =
    tab === "exports"
      ? []
      : sampleRecords[tab].filter((record) =>
          `${record.name} ${record.detail} ${record.status}`
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
        );
  function selectTab(next: PreviewTab) {
    setTab(next);
    setQuery("");
    setExported(false);
  }
  function handleTabKey(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[next].id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
  return (
    <div
      className="sb-workspace sb-interactive-workspace"
      aria-label="Interactive ServeBase preview using fictional sample data"
    >
      <div className="sb-window-bar">
        <div className="sb-window-dots">
          <i />
          <i />
          <i />
        </div>
        <span>
          <Icon name="layers" size={12} />
          servebase / {tab}
        </span>
        <span className="sb-window-status" />
      </div>
      <div className="sb-demo-body">
        <div className="sb-demo-title">
          <div>
            <span className="sb-tiny-label">
              WORKING SAMPLE / FICTIONAL RECORDS
            </span>
            <h3>A look inside the register</h3>
          </div>
          <span className="sb-sample">Interactive preview</span>
        </div>
        <div className="sb-preview-stats">
          <div>
            <Icon name="users" size={16} />
            <strong>16</strong>
            <span>Volunteers</span>
          </div>
          <div>
            <Icon name="heart" size={16} />
            <strong>10</strong>
            <span>Donors</span>
          </div>
          <div>
            <Icon name="calendar" size={16} />
            <strong>7</strong>
            <span>Community drives</span>
          </div>
        </div>
        <div
          className="sb-demo-tabs"
          role="tablist"
          aria-label="Explore platform modules"
        >
          {tabs.map((item, index) => (
            <button
              key={item.id}
              id={`sb-tab-${item.id}`}
              role="tab"
              aria-selected={tab === item.id}
              aria-controls="sb-demo-panel"
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => selectTab(item.id)}
              onKeyDown={(event) => handleTabKey(event, index)}
            >
              <Icon name={item.icon} size={13} />
              {item.label}
            </button>
          ))}
        </div>
        <div
          className="sb-demo-panel"
          id="sb-demo-panel"
          role="tabpanel"
          aria-labelledby={`sb-tab-${tab}`}
          tabIndex={0}
        >
          {tab === "exports" ? (
            <div className="sb-demo-export">
              <div className="sb-demo-export-intro">
                <span className="sb-icon-box">
                  <Icon name="download" size={20} />
                </span>
                <div>
                  <strong>Your records, ready to go.</strong>
                  <p>Choose a sample dataset to export.</p>
                </div>
              </div>
              <label className="sb-export-label" htmlFor="sb-export-module">
                DATASET
              </label>
              <select
                id="sb-export-module"
                value={exportModule}
                onChange={(event) => {
                  setExportModule(event.target.value as Module);
                  setExported(false);
                }}
              >
                <option value="volunteers">Volunteer profiles</option>
                <option value="donors">Donor records</option>
                <option value="drives">Community drives</option>
              </select>
              <div className="sb-export-summary">
                <span>3 fictional records</span>
                <span>CSV · UTF-8</span>
              </div>
              <button
                className="sb-btn sb-btn-dark sb-demo-download"
                onClick={() => {
                  downloadSampleCsv(exportModule);
                  setExported(true);
                }}
              >
                <Icon name={exported ? "check" : "download"} size={14} />
                {exported ? "Download again" : "Download sample CSV"}
              </button>
              <p className="sb-download-message" role="status">
                {exported
                  ? "Sample CSV prepared. Your download has started."
                  : "Illustrative data only. No personal information."}
              </p>
            </div>
          ) : (
            <>
              <div className="sb-demo-search">
                <Icon name="search" size={14} />
                <input
                  aria-label={`Search sample ${tab}`}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${tab}…`}
                  type="search"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <Icon name="close" size={13} />
                  </button>
                )}
              </div>
              <div className="sb-preview-table">
                <div className="sb-preview-table-head">
                  <span>{headings[tab][0]}</span>
                  <span>{headings[tab][1]}</span>
                </div>
                <div className="sb-demo-records">
                  {records.length ? (
                    records.map((record) => (
                      <div className="sb-preview-person" key={record.id}>
                        <span className={`sb-avatar ${record.color}`}>
                          {record.initials}
                        </span>
                        <div>
                          <strong>{record.name}</strong>
                          <small>{record.detail}</small>
                        </div>
                        <span className="sb-demo-record-status">
                          {record.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="sb-demo-empty">
                      <Icon name="search" size={20} />
                      <strong>No matching records</strong>
                      <span>Try a name, skill, or status.</span>
                      <button onClick={() => setQuery("")}>Clear search</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="sb-demo-record-footer">
                <span role="status">{records.length} of 3 sample records</span>
                <span>Fictional data</span>
              </div>
            </>
          )}
        </div>
        <div className="sb-demo-hint">
          <Icon name="check" size={12} />
          <span>Change the view, find a record, or try a sample export.</span>
        </div>
      </div>
    </div>
  );
}

const layers: {
  n: string;
  icon: IconName;
  label: string;
  title: string;
  desc: string;
  detail: string;
}[] = [
  {
    n: "01",
    icon: "layers",
    label: "FRONTEND",
    title: "React.js + Tailwind CSS",
    desc: "UI Architecture",
    detail:
      "A single interface for volunteer profiles, donor directories, drive participation, and report downloads.",
  },
  {
    n: "02",
    icon: "code",
    label: "BACKEND API",
    title: "Node.js + Express",
    desc: "REST API Gateway",
    detail:
      "The planned REST layer validates requests and connects the admin interface to structured records.",
  },
  {
    n: "03",
    icon: "database",
    label: "DATABASE ENGINE",
    title: "Relational MySQL / Firebase",
    desc: "Centralized Data Schema",
    detail:
      "Volunteer and donor identifiers connect people to participation and contribution histories. MySQL is the proposed relational engine; Firebase is an alternative.",
  },
  {
    n: "04",
    icon: "download",
    label: "DATA OUTPUT",
    title: "JSON-to-CSV",
    desc: "Stream Subsystem",
    detail:
      "Structured records become portable CSV reports for offline analysis, institutional reviews, and backups.",
  },
];
export function ArchitectureExplorer() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="sb-stack sb-stack-explorer">
      <div className="sb-stack-label">
        <span>SYSTEM ARCHITECTURE</span>
        <span>SELECT A LAYER TO EXPLORE</span>
      </div>
      {layers.map((layer) => (
        <div className="sb-stack-item" key={layer.n}>
          <button
            className="sb-stack-row"
            aria-expanded={open === layer.n}
            aria-controls={`sb-layer-${layer.n}`}
            id={`sb-layer-button-${layer.n}`}
            onClick={() => setOpen(open === layer.n ? null : layer.n)}
          >
            <span className="sb-stack-number">{layer.n}</span>
            <span className="sb-stack-icon">
              <Icon name={layer.icon} size={19} />
            </span>
            <span className="sb-stack-text">
              <span className="sb-stack-eyebrow">{layer.label}</span>
              <strong>{layer.title}</strong>
              <small>{layer.desc}</small>
            </span>
            <Icon name="chevron" size={15} />
          </button>
          <div
            id={`sb-layer-${layer.n}`}
            role="region"
            aria-labelledby={`sb-layer-button-${layer.n}`}
            hidden={open !== layer.n}
            className="sb-stack-detail"
          >
            <p>{layer.detail}</p>
          </div>
        </div>
      ))}
      <p className="sb-stack-prototype-note">
        Proposed system architecture · Academic prototype
      </p>
    </div>
  );
}
