import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./ServeBaseIcons";
import type { IconName } from "./ServeBaseIcons";
import {
  downloadCsv,
  formatDate,
  formatMoney,
  useWorkspace,
} from "./ServeBaseStore";

const monthName = (month: string) =>
  new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("");
const createActions: {
  title: string;
  detail: string;
  href: string;
  icon: IconName;
}[] = [
  {
    title: "Add volunteer",
    detail: "Profile, skills & availability",
    href: "volunteers",
    icon: "users",
  },
  {
    title: "Add a donor",
    detail: "Individual or institutional contact",
    href: "donors",
    icon: "heart",
  },
  {
    title: "Record contribution",
    detail: "Money or goods linked to a donor",
    href: "donations",
    icon: "database",
  },
  {
    title: "Plan a drive",
    detail: "Date, location & roster capacity",
    href: "drives",
    icon: "calendar",
  },
  {
    title: "Log participation",
    detail: "Role, attendance & service hours",
    href: "participation",
    icon: "check",
  },
];

function CreateRecord() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      className="cx-create"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        className="cx-create-trigger"
        ref={trigger}
        aria-expanded={open}
        aria-controls="cx-create-options"
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(() =>
              root.current?.querySelector<HTMLAnchorElement>("a")?.focus(),
            );
          }
        }}
      >
        <span className="cx-create-glyph" aria-hidden="true">
          +
        </span>
        <span>Create a record</span>
        <Icon name="chevron" size={14} />
      </button>
      {open && (
        <div
          className="cx-create-options"
          id="cx-create-options"
          role="region"
          aria-label="Create a workspace record"
        >
          <div className="cx-micro">CHOOSE A STARTING POINT</div>
          {createActions.map((action, i) => (
            <a
              key={action.href}
              href={`#/admin/${action.href}?action=add`}
              onClick={() => setOpen(false)}
            >
              <span className="cx-create-icon">
                <Icon name={action.icon} size={17} />
              </span>
              <span>
                <strong>{action.title}</strong>
                <small>{action.detail}</small>
              </span>
              <em>0{i + 1}</em>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

const procedures = [
  {
    name: "Before a drive",
    icon: "calendar" as IconName,
    title: "Build the roster in the right order.",
    steps: [
      "Create active volunteer profiles with contact details, skills, and availability.",
      "Plan the drive with its date, location, capacity, and SDG alignment.",
      "Register each person in Participation and give them a specific role.",
    ],
    href: "participation?action=add",
    action: "Register a volunteer",
    note: "A person can have one participation record per drive. Capacity is checked when registering.",
  },
  {
    name: "After a drive",
    icon: "check" as IconName,
    title: "Close the loop on attendance.",
    steps: [
      "Open Participation and filter by the completed drive.",
      "Edit each assignment to mark Attended or Absent.",
      "Enter actual service hours for attendees, then save the record.",
    ],
    href: "participation",
    action: "Review attendance",
    note: "Only attended records contribute to the service-hour total. The history appears under both the person and the drive.",
  },
  {
    name: "For a review",
    icon: "download" as IconName,
    title: "Prepare a report you can trace.",
    steps: [
      "Check that contributions point to the correct donor and have an accurate received date.",
      "Choose a dataset and date range in Reports & exports, then inspect the preview.",
      "Export the CSV and download a full JSON backup before moving devices.",
    ],
    href: "reports",
    action: "Prepare a report",
    note: "CSV files are for analysis. The full JSON backup preserves linked records and can be restored from Settings.",
  },
];

export function OverviewPage() {
  const { db, update } = useWorkspace();
  const derived = useMemo(() => {
    const donors = new Map(db.donors.map((d) => [d.id, d]));
    const drives = new Map(db.drives.map((d) => [d.id, d]));
    const volunteers = new Set(db.volunteers.map((v) => v.id));
    const rosters = new Map(
      db.drives.map((d) => [d.id, [] as typeof db.participation]),
    );
    db.participation.forEach((p) => rosters.get(p.driveId)?.push(p));
    const months = [
      ...new Set([
        ...db.donations.map((d) => d.date.slice(0, 7)),
        ...db.drives.map((d) => d.date.slice(0, 7)),
      ]),
    ]
      .sort()
      .reverse();
    const latest =
      [...db.donations.map((d) => d.date.slice(0, 7))].sort().at(-1) ||
      months[0] ||
      new Date().toLocaleDateString("en-CA").slice(0, 7);
    const scheduled = db.drives
      .filter((d) => d.status === "Upcoming" || d.status === "Ongoing")
      .sort((a, b) => a.date.localeCompare(b.date));
    const gaps = scheduled.filter(
      (d) => (rosters.get(d.id)?.length || 0) < d.capacity,
    );
    const pending = db.participation.filter(
      (p) =>
        p.status === "Registered" &&
        drives.get(p.driveId)?.status === "Completed",
    );
    const contributingDonors = new Set(db.donations.map((c) => c.donorId));
    const noContributions = db.donors.filter(
      (d) => !contributingDonors.has(d.id),
    );
    const broken =
      db.donations.filter((d) => !donors.has(d.donorId)).length +
      db.participation.filter(
        (p) => !volunteers.has(p.volunteerId) || !drives.has(p.driveId),
      ).length;
    return {
      donors,
      drives,
      rosters,
      months,
      latest,
      scheduled,
      gaps,
      pending,
      noContributions,
      broken,
    };
  }, [db]);
  const [period, setPeriod] = useState(derived.latest);
  const [chart, setChart] = useState<"money" | "hours">("money");
  const [driveView, setDriveView] = useState("all");
  const [driveQuery, setDriveQuery] = useState("");
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState({
    location: true,
    impact: true,
    hours: true,
  });
  const [procedure, setProcedure] = useState(0);
  const [notice, setNotice] = useState("");
  const columnMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !columnMenu.current?.contains(event.target) &&
        columnMenu.current
      )
        columnMenu.current.open = false;
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const donations = db.donations.filter(
    (d) => period === "all" || d.date.startsWith(period),
  );
  const periodDrives = db.drives.filter(
    (d) => period === "all" || d.date.startsWith(period),
  );
  const periodDriveIds = new Set(periodDrives.map((d) => d.id));
  const attended = db.participation.filter(
    (p) =>
      p.status === "Attended" &&
      (period === "all" || periodDriveIds.has(p.driveId)),
  );
  const hours = attended.reduce((sum, p) => sum + p.hours, 0);
  const monetary = donations
    .filter((d) => d.type === "Monetary")
    .reduce((sum, d) => sum + d.amount, 0);
  const activeVolunteers = db.volunteers.filter(
    (v) => v.status === "Active",
  ).length;
  const periodLabel = period === "all" ? "All time" : monthName(period);
  const monthValues = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const end = new Date(`${derived.latest}-01T12:00:00`);
        end.setMonth(end.getMonth() - (5 - i));
        const month = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`;
        const ids = new Set(
          db.drives.filter((d) => d.date.startsWith(month)).map((d) => d.id),
        );
        return {
          month,
          money: db.donations
            .filter((d) => d.type === "Monetary" && d.date.startsWith(month))
            .reduce((sum, d) => sum + d.amount, 0),
          hours: db.participation
            .filter((p) => p.status === "Attended" && ids.has(p.driveId))
            .reduce((sum, p) => sum + p.hours, 0),
        };
      }),
    [db, derived.latest],
  );
  const maxValue = Math.max(1, ...monthValues.map((m) => m[chart]));
  const chartTotal = monthValues.reduce((sum, m) => sum + m[chart], 0);
  const filteredDrives = periodDrives
    .filter(
      (d) =>
        (driveView === "all" ||
          (driveView === "scheduled"
            ? d.status === "Upcoming" || d.status === "Ongoing"
            : d.status === "Completed")) &&
        `${d.name} ${d.location}`
          .toLowerCase()
          .includes(driveQuery.toLowerCase().trim()),
    )
    .sort((a, b) => {
      const priority = { Ongoing: 0, Upcoming: 1, Completed: 2, Cancelled: 3 };
      return (
        priority[a.status] - priority[b.status] ||
        (a.status === "Completed"
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date))
      );
    });
  const totalPages = Math.max(1, Math.ceil(filteredDrives.length / 4));
  const safePage = Math.min(page, totalPages);
  const recent = [...donations]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const guide = procedures[procedure];
  const openPlaces = derived.gaps.reduce(
    (sum, d) => sum + d.capacity - (derived.rosters.get(d.id)?.length || 0),
    0,
  );
  useEffect(() => setPage(1), [period, driveView, driveQuery]);
  const allPeriods = [
    ...new Set([period === "all" ? derived.latest : period, ...derived.months]),
  ]
    .sort()
    .reverse();

  function exportBrief() {
    const rows: (string | number)[][] = [
      [
        "Summary",
        "Active volunteers",
        "",
        "",
        activeVolunteers,
        "profiles",
        "Whole directory",
      ],
      [
        "Summary",
        "Monetary contributions",
        "",
        "",
        monetary,
        "INR",
        periodLabel,
      ],
      [
        "Summary",
        "Community drives",
        "",
        "",
        periodDrives.length,
        "drives",
        periodLabel,
      ],
      ["Summary", "Volunteer hours", "", "", hours, "hours", periodLabel],
      ...periodDrives.map((d) => [
        "Drive",
        d.name,
        d.date,
        d.status,
        derived.rosters.get(d.id)?.length || 0,
        "roster entries",
        `${d.location}; Capacity ${d.capacity}; ${d.sdg}`,
      ]),
      ...donations.map((d) => [
        "Contribution",
        derived.donors.get(d.donorId)?.name || d.donorId,
        d.date,
        d.type,
        d.amount,
        d.type === "Monetary" ? "INR" : "INR (in-kind estimated value)",
        `${d.id}; ${d.category}`,
      ]),
    ];
    downloadCsv(
      `servebase-operations-${period}.csv`,
      ["Section", "Record", "Date", "Status / type", "Value", "Unit", "Detail"],
      rows,
    );
    setNotice(
      `Operations brief prepared: ${periodLabel}, ${periodDrives.length} drives and ${donations.length} contributions.`,
    );
    update((data) => data, {
      title: "Operations brief exported",
      detail: `${periodLabel} · ${periodDrives.length} drives · ${donations.length} contributions`,
      kind: "report",
    });
  }

  return (
    <div className="db-overview cx-overview">
      <div className="cx-heading">
        <div>
          <div className="cx-micro">
            <span className="cx-live-dot" />
            OPERATIONS / OVERVIEW
          </div>
          <h1>
            A clearer view of the work<span>.</span>
          </h1>
          <p>
            {db.settings.adminName.split(" ")[0]}, here’s what’s recorded,
            what’s scheduled, and where a follow-up would help.
          </p>
        </div>
        <div className="cx-heading-actions">
          <label className="cx-period">
            <Icon name="calendar" size={15} />
            <select
              aria-label="Overview reporting period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {allPeriods.map((m) => (
                <option key={m} value={m}>
                  {monthName(m)}
                </option>
              ))}
              <option value="all">All time</option>
            </select>
          </label>
          <CreateRecord />
        </div>
      </div>
      <div className="cx-scope">
        <span>
          <i />
          Browser workspace <b>/</b> Fictional sample records + your edits
        </span>
        <span>
          Selected period <strong>{periodLabel}</strong>
          <button onClick={exportBrief}>
            <Icon name="download" size={13} />
            Export brief
          </button>
        </span>
      </div>
      {notice && (
        <div className="cx-notice" role="status">
          <Icon name="check" size={16} />
          {notice}
          <button
            aria-label="Dismiss export notice"
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      <div className="db-metric-grid cx-metrics">
        <a
          className="db-metric-card cx-metric"
          data-tone="mint"
          href="#/admin/volunteers"
        >
          <div>
            <span>Active volunteers</span>
            <Icon name="users" size={18} />
          </div>
          <strong>
            {activeVolunteers}
            <small> / {db.volunteers.length}</small>
          </strong>
          <p>
            {db.volunteers.length - activeVolunteers} inactive · whole directory
          </p>
          <span className="cx-metric-foot">
            Open directory
            <Icon name="arrow" size={13} />
          </span>
        </a>
        <a
          className="db-metric-card cx-metric"
          data-tone="amber"
          href="#/admin/donations"
        >
          <div>
            <span>Monetary contributions</span>
            <Icon name="heart" size={18} />
          </div>
          <strong>{formatMoney(monetary)}</strong>
          <p>
            {donations.filter((d) => d.type === "Monetary").length} monetary ·{" "}
            {donations.filter((d) => d.type === "In-kind").length} in-kind
            entries
          </p>
          <span className="cx-metric-foot">
            Selected period
            <Icon name="arrow" size={13} />
          </span>
        </a>
        <a
          className="db-metric-card cx-metric"
          data-tone="violet"
          href="#/admin/drives"
        >
          <div>
            <span>Community drives</span>
            <Icon name="calendar" size={18} />
          </div>
          <strong>
            {periodDrives.length}
            <small> drives</small>
          </strong>
          <p>
            {periodDrives.filter((d) => d.status === "Completed").length}{" "}
            completed ·{" "}
            {
              periodDrives.filter(
                (d) => d.status === "Upcoming" || d.status === "Ongoing",
              ).length
            }{" "}
            scheduled
          </p>
          <span className="cx-metric-foot">
            Selected period
            <Icon name="arrow" size={13} />
          </span>
        </a>
        <a
          className="db-metric-card cx-metric"
          data-tone="blue"
          href="#/admin/participation"
        >
          <div>
            <span>Volunteer hours</span>
            <Icon name="check" size={18} />
          </div>
          <strong>
            {hours.toLocaleString("en-IN")}
            <small> hrs</small>
          </strong>
          <p>{attended.length} attended assignments · selected period</p>
          <span className="cx-metric-foot">
            View participation
            <Icon name="arrow" size={13} />
          </span>
        </a>
      </div>
      <nav className="cx-action-lane" aria-label="Common workspace actions">
        <span className="cx-micro">START SOMETHING</span>
        {createActions
          .filter((a) => a.href !== "volunteers")
          .map((action, i) => (
            <a href={`#/admin/${action.href}?action=add`} key={action.href}>
              <span className="cx-action-number">0{i + 1}</span>
              <Icon name={action.icon} size={16} />
              <span>{action.title}</span>
              <Icon name="arrow" size={14} />
            </a>
          ))}
      </nav>

      <div className="cx-insight-grid">
        <section
          className="cx-panel cx-trends"
          aria-labelledby="cx-trend-title"
        >
          <header className="cx-panel-heading">
            <div>
              <span className="cx-micro">01 / RECORDED OUTPUT</span>
              <h2 id="cx-trend-title">The last six months</h2>
              <p>Click a month to scope the overview.</p>
            </div>
            <div className="cx-segment" aria-label="Trend measure">
              <button
                aria-pressed={chart === "money"}
                onClick={() => setChart("money")}
              >
                Contributions
              </button>
              <button
                aria-pressed={chart === "hours"}
                onClick={() => setChart("hours")}
              >
                Service hours
              </button>
            </div>
          </header>
          <div className="cx-trend-total">
            <strong>
              {chart === "money"
                ? formatMoney(chartTotal)
                : `${chartTotal.toLocaleString("en-IN")} hrs`}
            </strong>
            <span>
              {chart === "money"
                ? "Monetary entries only"
                : "Attended participation only"}
              <small>
                {monthName(monthValues[0].month)} –{" "}
                {monthName(monthValues[5].month)}
              </small>
            </span>
          </div>
          <div
            className="cx-chart"
            role="group"
            aria-label={
              chart === "money"
                ? "Monthly monetary contributions"
                : "Monthly attended service hours"
            }
          >
            <div className="cx-chart-axis">
              <span>
                {chart === "money" ? formatMoney(maxValue) : `${maxValue} h`}
              </span>
              <span>
                {chart === "money"
                  ? formatMoney(maxValue / 2)
                  : `${maxValue / 2} h`}
              </span>
              <span>0</span>
            </div>
            <div className="cx-chart-columns">
              {monthValues.map((m) => (
                <button
                  key={m.month}
                  className={m.month === period ? "is-selected" : ""}
                  aria-pressed={m.month === period}
                  aria-label={`View ${monthName(m.month)}: ${chart === "money" ? formatMoney(m.money) : `${m.hours} hours`}`}
                  onClick={() => setPeriod(m.month)}
                >
                  <span className="cx-bar-space">
                    <span
                      className="cx-bar"
                      data-value={m[chart]}
                      style={{
                        height: `${m[chart] ? Math.max(3, (m[chart] / maxValue) * 100) : 0}%`,
                      }}
                    />
                    <span className="cx-bar-value">
                      {chart === "money"
                        ? formatMoney(m.money)
                        : `${m.hours} h`}
                    </span>
                  </span>
                  <small>
                    {new Date(`${m.month}-01T12:00:00`).toLocaleDateString(
                      "en-IN",
                      { month: "short" },
                    )}
                  </small>
                </button>
              ))}
            </div>
          </div>
          <footer className="cx-panel-footer">
            <span>Actual records; no estimated growth.</span>
            <a href="#/admin/reports">
              Explore reports
              <Icon name="arrow" size={13} />
            </a>
          </footer>
        </section>
        <section
          className="cx-panel cx-review"
          aria-labelledby="cx-review-title"
        >
          <header className="cx-panel-heading">
            <div>
              <span className="cx-micro">02 / FOLLOW THROUGH</span>
              <h2 id="cx-review-title">Worth a closer look</h2>
              <p>Checks across the whole workspace.</p>
            </div>
            <span className="cx-live-label">Record based</span>
          </header>
          <a
            className="cx-review-row"
            href={`#/admin/${derived.gaps[0] ? `participation?q=${encodeURIComponent(derived.gaps[0].name)}` : "drives"}`}
          >
            <span className="cx-review-icon mint">
              <Icon name="users" size={18} />
            </span>
            <div>
              <strong>
                {derived.gaps.length
                  ? `${openPlaces} unfilled roster ${openPlaces === 1 ? "place" : "places"}`
                  : "Scheduled rosters are filled"}
              </strong>
              <p>
                {derived.gaps.length
                  ? `Across ${derived.gaps.length} scheduled drives. Review capacity and assign available volunteers.`
                  : "No unfilled places on upcoming or ongoing drives."}
              </p>
              <small>
                Review rosters
                <Icon name="arrow" size={12} />
              </small>
            </div>
          </a>
          <a
            className="cx-review-row"
            href={`#/admin/participation${derived.pending[0] ? `?q=${encodeURIComponent(derived.drives.get(derived.pending[0].driveId)?.name || "")}` : ""}`}
          >
            <span className="cx-review-icon amber">
              <Icon name="check" size={18} />
            </span>
            <div>
              <strong>
                {derived.pending.length
                  ? `${derived.pending.length} attendance ${derived.pending.length === 1 ? "decision" : "decisions"} pending`
                  : "No pending attendance on completed drives"}
              </strong>
              <p>
                Registered assignments on completed drives need an Attended or
                Absent decision.
              </p>
              <small>
                Check participation
                <Icon name="arrow" size={12} />
              </small>
            </div>
          </a>
          <a
            className="cx-review-row"
            href={`#/admin/donors${derived.noContributions[0] ? `?q=${encodeURIComponent(derived.noContributions[0].name)}` : ""}`}
          >
            <span className="cx-review-icon violet">
              <Icon name="heart" size={18} />
            </span>
            <div>
              <strong>
                {derived.noContributions.length
                  ? `${derived.noContributions.length} ${derived.noContributions.length === 1 ? "donor" : "donors"} without contribution entries`
                  : "Every donor has a contribution entry"}
              </strong>
              <p>
                A directory profile can exist before a donation. Check whether a
                first contribution needs logging.
              </p>
              <small>
                Open donor directory
                <Icon name="arrow" size={12} />
              </small>
            </div>
          </a>
        </section>
      </div>

      <section
        className="cx-panel cx-drive-board"
        aria-labelledby="cx-drive-title"
      >
        <header className="cx-panel-heading">
          <div>
            <span className="cx-micro">03 / DELIVERY BOARD</span>
            <h2 id="cx-drive-title">Community operations</h2>
            <p>
              Dates, capacity, recorded hours, and a direct route to each
              roster.
            </p>
          </div>
          <a className="cx-text-link" href="#/admin/drives?action=add">
            Plan a drive<span>+</span>
          </a>
        </header>
        <div className="cx-board-toolbar">
          <div className="cx-segment" aria-label="Drive view">
            {[
              { id: "all", name: "All drives" },
              { id: "scheduled", name: "Scheduled" },
              { id: "completed", name: "Completed" },
            ].map((v) => (
              <button
                key={v.id}
                aria-pressed={driveView === v.id}
                onClick={() => setDriveView(v.id)}
              >
                {v.name}
              </button>
            ))}
          </div>
          <div className="cx-table-tools">
            <label className="cx-table-search">
              <Icon name="search" size={14} />
              <input
                aria-label="Filter drives in overview"
                placeholder="Find a drive or location"
                value={driveQuery}
                onChange={(e) => setDriveQuery(e.target.value)}
              />
            </label>
            <details
              className="cx-columns"
              ref={columnMenu}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}
            >
              <summary>
                <Icon name="layers" size={14} />
                <span>Columns</span>
              </summary>
              <div>
                <strong>Visible columns</strong>
                {(["location", "impact", "hours"] as const).map((key) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={columns[key]}
                      onChange={(e) =>
                        setColumns({ ...columns, [key]: e.target.checked })
                      }
                    />
                    {key === "location"
                      ? "Location"
                      : key === "impact"
                        ? "SDG alignment"
                        : "Service hours"}
                  </label>
                ))}
              </div>
            </details>
          </div>
        </div>
        <div
          className="cx-table-scroll"
          role="region"
          aria-label="Community operations table"
          tabIndex={0}
        >
          <table className="cx-table">
            <thead>
              <tr>
                <th>Drive / scheduled date</th>
                {columns.location && <th>Location</th>}
                <th>Roster / capacity</th>
                {columns.hours && <th>Hours</th>}
                {columns.impact && <th>Alignment</th>}
                <th>Status</th>
                <th>
                  <span className="cx-sr">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDrives
                .slice((safePage - 1) * 4, safePage * 4)
                .map((d) => {
                  const roster = derived.rosters.get(d.id) || [];
                  const service = roster
                    .filter((p) => p.status === "Attended")
                    .reduce((sum, p) => sum + p.hours, 0);
                  return (
                    <tr key={d.id}>
                      <td>
                        <a
                          className="cx-record-title"
                          href={`#/admin/drives?q=${encodeURIComponent(d.name)}`}
                        >
                          {d.name}
                        </a>
                        <small>
                          {formatDate(d.date)}{" "}
                          <span>· {d.id.toUpperCase()}</span>
                        </small>
                      </td>
                      {columns.location && (
                        <td className="cx-location">{d.location}</td>
                      )}
                      <td>
                        <div className="cx-capacity">
                          <strong>
                            {roster.length}
                            <span> / {d.capacity}</span>
                          </strong>
                          <span className="cx-capacity-track">
                            <i
                              style={{
                                width: `${d.capacity ? Math.min(100, (roster.length / d.capacity) * 100) : 0}%`,
                              }}
                            />
                          </span>
                        </div>
                      </td>
                      {columns.hours && (
                        <td>
                          <strong>{service.toLocaleString("en-IN")}</strong>
                          <span className="cx-unit"> h</span>
                        </td>
                      )}
                      {columns.impact && (
                        <td>
                          <span className="cx-sdg">{d.sdg}</span>
                        </td>
                      )}
                      <td>
                        <span className={`cx-status ${d.status.toLowerCase()}`}>
                          <i />
                          {d.status}
                        </span>
                      </td>
                      <td>
                        <a
                          className="cx-row-action"
                          href={`#/admin/participation?q=${encodeURIComponent(d.name)}`}
                          aria-label={`Open roster for ${d.name}`}
                        >
                          <Icon name="arrow" size={16} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              {!filteredDrives.length && (
                <tr>
                  <td
                    colSpan={
                      4 +
                      Number(columns.location) +
                      Number(columns.impact) +
                      Number(columns.hours)
                    }
                  >
                    <div className="cx-empty">
                      <Icon name="calendar" size={24} />
                      <strong>No drives match this view.</strong>
                      <p>
                        Change the reporting period, clear the search, or plan a
                        new drive.
                      </p>
                      <button
                        onClick={() => {
                          setDriveQuery("");
                          setDriveView("all");
                        }}
                      >
                        Clear drive filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="cx-panel-footer">
          <span>
            {filteredDrives.length
              ? `${(safePage - 1) * 4 + 1}–${Math.min(safePage * 4, filteredDrives.length)} of ${filteredDrives.length} drives`
              : "0 drives"}{" "}
            <b>·</b> {periodLabel}
          </span>
          <div className="cx-pagination">
            <button
              aria-label="Previous overview drives"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              <Icon name="chevron" size={13} />
            </button>
            <span>
              {safePage} / {totalPages}
            </span>
            <button
              aria-label="Next overview drives"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              <Icon name="chevron" size={13} />
            </button>
          </div>
        </footer>
      </section>

      <div className="cx-ledger-grid">
        <section
          className="cx-panel cx-ledger"
          aria-labelledby="cx-ledger-title"
        >
          <header className="cx-panel-heading">
            <div>
              <span className="cx-micro">04 / CONTRIBUTION REGISTER</span>
              <h2 id="cx-ledger-title">Latest support received</h2>
              <p>The five latest entries in the selected period.</p>
            </div>
            <a className="cx-text-link" href="#/admin/donations">
              Full ledger
              <Icon name="arrow" size={14} />
            </a>
          </header>
          <div
            className="cx-table-scroll"
            role="region"
            aria-label="Recent contributions table"
            tabIndex={0}
          >
            <table className="cx-table">
              <thead>
                <tr>
                  <th>Supporter / record</th>
                  <th>Contribution</th>
                  <th>Received</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((d) => {
                  const donor = derived.donors.get(d.donorId);
                  return (
                    <tr key={d.id}>
                      <td>
                        <a
                          className="cx-donor"
                          href={`#/admin/donors?q=${encodeURIComponent(donor?.name || d.donorId)}`}
                        >
                          <span className="cx-avatar">
                            {initials(donor?.name || "Unknown")}
                          </span>
                          <span>
                            <strong>{donor?.name || "Unknown donor"}</strong>
                            <small>
                              {d.id.toUpperCase()} · {donor?.type || "Unlinked"}
                            </small>
                          </span>
                        </a>
                      </td>
                      <td>
                        <strong>
                          {d.type === "Monetary"
                            ? formatMoney(d.amount)
                            : d.category}
                        </strong>
                        <small>
                          {d.type === "Monetary"
                            ? d.category
                            : "In-kind contribution"}
                        </small>
                      </td>
                      <td>{formatDate(d.date)}</td>
                      <td>
                        <span
                          className={`cx-ledger-type ${d.type === "Monetary" ? "money" : "goods"}`}
                        >
                          {d.type}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!recent.length && (
                  <tr>
                    <td colSpan={4}>
                      <div className="cx-empty">
                        <Icon name="heart" size={23} />
                        <strong>No contributions in this period.</strong>
                        <p>
                          Choose another month or record a contribution from a
                          supporter.
                        </p>
                        <a href="#/admin/donations?action=add">
                          Record contribution
                          <Icon name="arrow" size={13} />
                        </a>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="cx-panel-footer">
            <span>In-kind entries remain separate from cash totals.</span>
            <a href="#/admin/donations?action=add">
              Add entry<span>+</span>
            </a>
          </footer>
        </section>
        <section
          className="cx-panel cx-procedure"
          aria-labelledby="cx-procedure-title"
        >
          <header className="cx-panel-heading">
            <div>
              <span className="cx-micro">05 / DESK INSTRUCTIONS</span>
              <h2 id="cx-procedure-title">The next step, explained</h2>
              <p>A practical sequence for the work in front of you.</p>
            </div>
            <Icon name="book" size={19} />
          </header>
          <div className="cx-procedure-tabs" aria-label="Working procedure">
            {procedures.map((p, i) => (
              <button
                key={p.name}
                aria-pressed={procedure === i}
                onClick={() => setProcedure(i)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="cx-procedure-body" key={procedure}>
            <h3>
              <Icon name={guide.icon} size={18} />
              {guide.title}
            </h3>
            <ol>
              {guide.steps.map((text, i) => (
                <li key={text}>
                  <span>0{i + 1}</span>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
            <div className="cx-procedure-note">
              <Icon name="shield" size={15} />
              <p>{guide.note}</p>
            </div>
            <a className="cx-procedure-action" href={`#/admin/${guide.href}`}>
              {guide.action}
              <Icon name="arrow" size={16} />
            </a>
          </div>
        </section>
      </div>

      <section
        className="cx-panel cx-activity"
        aria-labelledby="cx-activity-title"
      >
        <header className="cx-panel-heading">
          <div>
            <span className="cx-micro">06 / CHANGE JOURNAL</span>
            <h2 id="cx-activity-title">The workspace, in motion</h2>
          </div>
          <a className="cx-text-link" href="#/admin/reports?dataset=activity">
            Export activity
            <Icon name="arrow" size={14} />
          </a>
        </header>
        <div className="cx-activity-grid">
          {db.activities.slice(0, 4).map((a) => (
            <article key={a.id}>
              <span className="cx-activity-kind">
                <i />
                {a.kind}
              </span>
              <strong>{a.title}</strong>
              <p>{a.detail}</p>
              <time dateTime={a.at}>
                {new Date(a.at).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </article>
          ))}
          {!db.activities.length && (
            <p className="cx-activity-empty">
              Add or update a record to begin the workspace journal.
            </p>
          )}
        </div>
      </section>
      <div className="cx-integrity">
        <span className="cx-integrity-icon">
          <Icon name="shield" size={19} />
        </span>
        <div>
          <strong>
            {derived.broken
              ? `${derived.broken} links need review`
              : "Record relationships intact"}
          </strong>
          <p>
            {db.donations.length + db.participation.length} contribution and
            participation records checked against their source profiles and
            drives.
          </p>
        </div>
        <a href="#/admin/settings?tab=data">
          Data & backups
          <Icon name="arrow" size={14} />
        </a>
      </div>
    </div>
  );
}
