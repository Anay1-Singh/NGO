export { OverviewPage } from "./ServeBaseOverview";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "./ServeBaseIcons";
import type { IconName } from "./ServeBaseIcons";
import {
  downloadCsv,
  formatDate,
  formatMoney,
  useWorkspace,
} from "./ServeBaseStore";
import type { WorkspaceData } from "./ServeBaseStore";

const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Kolkata",
});
function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="db-empty">
      <Icon name="layers" size={26} />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
function downloadBackup(db: WorkspaceData) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(db, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `servebase-backup-${today}.json`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Dataset =
  | "volunteers"
  | "donors"
  | "donations"
  | "drives"
  | "participation"
  | "activity";
const datasets: {
  id: Dataset;
  title: string;
  description: string;
  icon: IconName;
}[] = [
  {
    id: "volunteers",
    title: "Volunteer directory",
    description: "Profiles, skills & availability",
    icon: "users",
  },
  {
    id: "donors",
    title: "Donor directory",
    description: "Contact & organization records",
    icon: "heart",
  },
  {
    id: "donations",
    title: "Contributions",
    description: "Amounts, types & donor links",
    icon: "database",
  },
  {
    id: "drives",
    title: "Community drives",
    description: "Drive details & capacity",
    icon: "calendar",
  },
  {
    id: "participation",
    title: "Participation",
    description: "Roles, attendance & hours",
    icon: "check",
  },
  {
    id: "activity",
    title: "Activity log",
    description: "Changes across the workspace",
    icon: "layers",
  },
];
function getReport(
  db: WorkspaceData,
  type: Dataset,
): { headers: string[]; rows: (string | number)[][]; dates: string[] } {
  if (type === "volunteers")
    return {
      headers: [
        "Volunteer ID",
        "Name",
        "Email",
        "Phone",
        "Skills",
        "Availability",
        "Status",
        "Joined on",
        "Notes",
      ],
      rows: db.volunteers.map((v) => [
        v.id,
        v.name,
        v.email,
        v.phone,
        v.skills.join("; "),
        v.availability,
        v.status,
        v.joinedOn,
        v.notes,
      ]),
      dates: db.volunteers.map((v) => v.joinedOn),
    };
  if (type === "donors")
    return {
      headers: [
        "Donor ID",
        "Name",
        "Donor type",
        "Email",
        "Phone",
        "Address",
        "Joined on",
        "Notes",
      ],
      rows: db.donors.map((d) => [
        d.id,
        d.name,
        d.type,
        d.email,
        d.phone,
        d.address,
        d.joinedOn,
        d.notes,
      ]),
      dates: db.donors.map((d) => d.joinedOn),
    };
  if (type === "donations")
    return {
      headers: [
        "Donation ID",
        "Donor ID",
        "Donor name",
        "Amount (INR)",
        "Date",
        "Type",
        "Category",
        "Notes",
      ],
      rows: db.donations.map((d) => [
        d.id,
        d.donorId,
        db.donors.find((p) => p.id === d.donorId)?.name || "",
        d.amount,
        d.date,
        d.type,
        d.category,
        d.notes,
      ]),
      dates: db.donations.map((d) => d.date),
    };
  if (type === "drives")
    return {
      headers: [
        "Drive ID",
        "Name",
        "Date",
        "Location",
        "Status",
        "Capacity",
        "SDG alignment",
        "Description",
      ],
      rows: db.drives.map((d) => [
        d.id,
        d.name,
        d.date,
        d.location,
        d.status,
        d.capacity,
        d.sdg,
        d.description,
      ]),
      dates: db.drives.map((d) => d.date),
    };
  if (type === "participation")
    return {
      headers: [
        "Participation ID",
        "Volunteer ID",
        "Volunteer name",
        "Drive ID",
        "Drive name",
        "Drive date",
        "Assigned role",
        "Attendance",
        "Hours",
        "Notes",
      ],
      rows: db.participation.map((p) => {
        const d = db.drives.find((d) => d.id === p.driveId);
        return [
          p.id,
          p.volunteerId,
          db.volunteers.find((v) => v.id === p.volunteerId)?.name || "",
          p.driveId,
          d?.name || "",
          d?.date || "",
          p.role,
          p.status,
          p.hours,
          p.notes,
        ];
      }),
      dates: db.participation.map(
        (p) => db.drives.find((d) => d.id === p.driveId)?.date || "",
      ),
    };
  return {
    headers: ["Activity ID", "Timestamp", "Action", "Details", "Module"],
    rows: db.activities.map((a) => [a.id, a.at, a.title, a.detail, a.kind]),
    dates: db.activities.map((a) => a.at.slice(0, 10)),
  };
}
export function ReportsPage({
  initialDataset = "volunteers",
}: {
  initialDataset?: string;
}) {
  const { db, update } = useWorkspace();
  const [dataset, setDataset] = useState<Dataset>(() =>
    datasets.some((d) => d.id === initialDataset)
      ? (initialDataset as Dataset)
      : "volunteers",
  );
  useEffect(() => {
    setDataset(
      datasets.some((d) => d.id === initialDataset)
        ? (initialDataset as Dataset)
        : "volunteers",
    );
  }, [initialDataset]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [notice, setNotice] = useState("");
  const report = useMemo(() => getReport(db, dataset), [db, dataset]);
  const invalidRange = !!from && !!to && from > to;
  const rows = report.rows.filter(
    (_, index) =>
      (!from || report.dates[index] >= from) &&
      (!to || report.dates[index] <= to),
  );
  const current = datasets.find((d) => d.id === dataset)!;
  function exportReport() {
    if (invalidRange || !rows.length) return;
    downloadCsv(`servebase-${dataset}-${today}.csv`, report.headers, rows);
    setNotice(`${rows.length} ${dataset} records prepared for download.`);
    update((data) => data, {
      title: "Report exported",
      detail: `${current.title} · ${rows.length} records`,
      kind: "report",
    });
  }
  function backup() {
    downloadBackup(db);
    setNotice("Full JSON backup prepared for download.");
    update((data) => data, {
      title: "Backup exported",
      detail: "Complete workspace downloaded as JSON",
      kind: "report",
    });
  }
  return (
    <div>
      <div className="db-page-head">
        <div>
          <div className="db-eyebrow">DATA PORTABILITY</div>
          <h1>
            Reports & exports<span>.</span>
          </h1>
          <p>
            Preview a directory or register, then export the matching rows as
            CSV.
          </p>
        </div>
        <button className="db-button" onClick={backup}>
          <Icon name="database" size={16} />
          Download full backup
        </button>
      </div>
      <div className="db-report-layout">
        <section className="db-panel db-report-datasets">
          <div className="db-panel-head">
            <div>
              <h2>Select a dataset</h2>
              <p>Directories, contributions, drive records, and activity.</p>
            </div>
          </div>
          <div>
            {datasets.map((item) => (
              <button
                className={dataset === item.id ? "is-active" : ""}
                key={item.id}
                aria-pressed={dataset === item.id}
                onClick={() => {
                  setDataset(item.id);
                  setNotice("");
                }}
              >
                <Icon name={item.icon} size={18} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <b>{getReport(db, item.id).rows.length}</b>
              </button>
            ))}
          </div>
          <div className="db-report-note">
            <Icon name="lock" size={16} />
            <p>
              Exports contain the records in this browser. Keep downloaded files
              with your organization’s other records.
            </p>
          </div>
        </section>
        <div className="db-report-main">
          <section className="db-panel">
            <div className="db-panel-head">
              <div>
                <h2>Refine your report</h2>
                <p>
                  {dataset === "activity"
                    ? "Filter by activity date."
                    : dataset === "volunteers" || dataset === "donors"
                      ? "Date filters apply to the profile’s joined date."
                      : dataset === "participation"
                        ? "Date filters apply to the linked drive date."
                        : "Select a date range or export every record."}
                </p>
              </div>
              <span className="db-status neutral">CSV · UTF-8</span>
            </div>
            <div className="db-report-filters">
              <label className="db-field">
                From date
                <input
                  aria-label="Report from date"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="db-field">
                To date
                <input
                  aria-label="Report to date"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
              <button
                className="db-button"
                onClick={() => {
                  setFrom("2026-10-01");
                  setTo("2026-10-31");
                }}
              >
                This month
              </button>
              <button
                className="db-button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
              >
                All time
              </button>
            </div>
            {invalidRange && (
              <p className="db-inline-error db-range-error" role="alert">
                The end date must be on or after the start date.
              </p>
            )}
            <div className="db-report-export-row">
              <div>
                <strong>{invalidRange ? 0 : rows.length} records</strong>
                <span>
                  {from || to
                    ? `${from ? formatDate(from) : "Beginning"} – ${to ? formatDate(to) : "Latest"}`
                    : "All recorded dates"}
                </span>
              </div>
              <button
                className="db-button primary"
                disabled={invalidRange || !rows.length}
                onClick={exportReport}
              >
                <Icon name="download" size={16} />
                Export {current.title.toLowerCase()}
              </button>
            </div>
          </section>
          {notice && (
            <div className="db-success-notice" role="status">
              <Icon name="check" size={17} />
              {notice}
            </div>
          )}
          <section className="db-panel">
            <div className="db-panel-head">
              <div>
                <h2>Report preview</h2>
                <p>
                  {current.title} · First {Math.min(rows.length, 8)} of{" "}
                  {rows.length} matching records
                </p>
              </div>
              <Icon name={current.icon} size={19} />
            </div>
            <div className="db-table-wrap">
              <table className="db-table db-report-preview">
                <thead>
                  <tr>
                    {report.headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!invalidRange &&
                    rows.slice(0, 8).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{String(cell) || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  {(invalidRange || !rows.length) && (
                    <tr>
                      <td colSpan={report.headers.length}>
                        <Empty
                          title={
                            invalidRange
                              ? "Check your date range"
                              : "No matching records"
                          }
                        >
                          Change the date range or select another dataset.
                        </Empty>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="db-panel-foot">
              <span>CSV includes every matching row and all columns.</span>
              <span>No aggregate or sample-only exports</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage({ initialTab }: { initialTab: string }) {
  const { db, update, resetDemo, importBackup } = useWorkspace();
  const [tab, setTab] = useState(
    ["profile", "data", "scope"].includes(initialTab) ? initialTab : "profile",
  );
  const [form, setForm] = useState(db.settings);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ text: string; name: string } | null>(
    null,
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const restoreDialog = useRef<HTMLDialogElement>(null);
  const resetDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    setTab(
      ["profile", "data", "scope"].includes(initialTab)
        ? initialTab
        : "profile",
    );
  }, [initialTab]);
  useEffect(() => setForm(db.settings), [db.settings]);
  function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (
      !form.organizationName.trim() ||
      !form.adminName.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail.trim())
    ) {
      setError(
        "Enter an organization name, administrator name, and a valid email address.",
      );
      return;
    }
    const saved = update(
      (data) => ({
        ...data,
        settings: {
          ...form,
          organizationName: form.organizationName.trim(),
          adminName: form.adminName.trim(),
          adminEmail: form.adminEmail.trim(),
        },
      }),
      {
        title: "Workspace settings updated",
        detail: form.organizationName.trim(),
        kind: "settings",
      },
    );
    if (!saved) {
      setError(
        "The settings could not be saved. Check the workspace notice for details.",
      );
      return;
    }
    setNotice("Workspace details saved in this browser.");
  }
  async function readBackup(file: File | undefined) {
    setError("");
    setNotice("");
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Choose a JSON backup smaller than 2 MB.");
      return;
    }
    try {
      const text = await file.text();
      JSON.parse(text);
      setPending({ text, name: file.name });
      restoreDialog.current?.showModal();
    } catch {
      setError(
        "This file is not valid JSON. Choose a ServeBase workspace backup.",
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  function restore() {
    if (!pending) return;
    const result = importBackup(pending.text);
    if (!result.ok) {
      setError(result.error || "This backup could not be restored.");
      restoreDialog.current?.close();
      setPending(null);
      return;
    }
    restoreDialog.current?.close();
    setPending(null);
    setNotice(
      "Workspace restored. Every module now uses the imported records.",
    );
  }
  const totalRecords =
    db.volunteers.length +
    db.donors.length +
    db.donations.length +
    db.drives.length +
    db.participation.length;
  return (
    <div>
      <div className="db-page-head">
        <div>
          <div className="db-eyebrow">ADMINISTRATION</div>
          <h1>
            Workspace settings<span>.</span>
          </h1>
          <p>
            Update organization details, manage backups, or review planned
            integrations.
          </p>
        </div>
        <span className="db-status neutral">v1.0 Institutional</span>
      </div>
      <div
        className="db-settings-tabs"
        role="group"
        aria-label="Settings sections"
      >
        {[
          { id: "profile", label: "Organization & profile" },
          { id: "data", label: "Data & backups" },
          { id: "scope", label: "Project scope" },
        ].map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "is-active" : ""}
            aria-pressed={tab === item.id}
            onClick={() => {
              setTab(item.id);
              setNotice("");
              setError("");
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {notice && (
        <div className="db-success-notice" role="status">
          <Icon name="check" size={17} />
          {notice}
        </div>
      )}
      {error && (
        <div className="db-inline-error db-notice" role="alert">
          {error}
        </div>
      )}
      {tab === "profile" && (
        <div className="db-settings-layout">
          <section className="db-panel">
            <div className="db-panel-head">
              <div>
                <h2>Organization & administrator</h2>
                <p>
                  Contact information for this organization and its
                  administrator.
                </p>
              </div>
              <Icon name="building" size={20} />
            </div>
            <form onSubmit={save} className="db-settings-form">
              <div className="db-form-grid">
                <label className="db-field db-full-width">
                  Organization name
                  <input
                    required
                    maxLength={120}
                    value={form.organizationName}
                    onChange={(e) =>
                      setForm({ ...form, organizationName: e.target.value })
                    }
                  />
                </label>
                <label className="db-field">
                  Administrator name
                  <input
                    required
                    maxLength={100}
                    value={form.adminName}
                    onChange={(e) =>
                      setForm({ ...form, adminName: e.target.value })
                    }
                  />
                </label>
                <label className="db-field">
                  Administrator email
                  <input
                    required
                    type="email"
                    maxLength={254}
                    value={form.adminEmail}
                    onChange={(e) =>
                      setForm({ ...form, adminEmail: e.target.value })
                    }
                  />
                </label>
                <label className="db-field">
                  Organization phone
                  <input
                    type="tel"
                    maxLength={24}
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </label>
                <label className="db-field">
                  Office address
                  <input
                    maxLength={240}
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="db-form-footer">
                <span>Saved locally. No account password is stored.</span>
                <button className="db-button primary" type="submit">
                  Save workspace details
                  <Icon name="check" size={15} />
                </button>
              </div>
            </form>
          </section>
          <aside className="db-panel db-settings-aside">
            <span className="db-settings-icon">
              <Icon name="shield" size={26} />
            </span>
            <h2>Administrator demo access</h2>
            <p>
              This workspace is open for evaluating the project. Login enters a
              local demo session without checking credentials.
            </p>
            <dl>
              <div>
                <dt>Workspace</dt>
                <dd>Local demo</dd>
              </div>
              <div>
                <dt>Storage</dt>
                <dd>This browser</dd>
              </div>
              <div>
                <dt>Authentication</dt>
                <dd>Backend pending</dd>
              </div>
              <div>
                <dt>Multi-user access</dt>
                <dd>Planned</dd>
              </div>
            </dl>
            <a href="#home" className="db-panel-text-link">
              View the landing page
              <Icon name="arrow" size={14} />
            </a>
          </aside>
        </div>
      )}
      {tab === "data" && (
        <div className="db-data-settings">
          <section className="db-panel">
            <div className="db-panel-head">
              <div>
                <h2>Workspace backup and restore</h2>
                <p>
                  {totalRecords} core records across five connected datasets.
                </p>
              </div>
              <Icon name="database" size={21} />
            </div>
            <div className="db-data-actions">
              <div>
                <span className="db-settings-icon">
                  <Icon name="download" size={22} />
                </span>
                <div>
                  <h3>Download a complete backup</h3>
                  <p>
                    A JSON file containing all profiles, contributions, drives,
                    participation, activity, and settings.
                  </p>
                </div>
                <button
                  className="db-button"
                  onClick={() => {
                    downloadBackup(db);
                    setNotice("Complete JSON backup prepared for download.");
                  }}
                >
                  Download JSON
                </button>
              </div>
              <div>
                <span className="db-settings-icon">
                  <Icon name="database" size={22} />
                </span>
                <div>
                  <h3>Restore a workspace backup</h3>
                  <p>
                    Choose a ServeBase JSON backup. Records and linked
                    identifiers are checked before replacing your current
                    workspace.
                  </p>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  className="db-file-input"
                  aria-label="Choose ServeBase backup"
                  onChange={(e) => void readBackup(e.target.files?.[0])}
                />
                <button
                  className="db-button"
                  onClick={() => fileInput.current?.click()}
                >
                  Choose backup
                </button>
              </div>
              <div>
                <span className="db-settings-icon">
                  <Icon name="book" size={22} />
                </span>
                <div>
                  <h3>Need a spreadsheet report?</h3>
                  <p>
                    Export individual datasets as CSV, with date filters and a
                    preview before downloading.
                  </p>
                </div>
                <a href="#/admin/reports" className="db-button">
                  Open reports
                </a>
              </div>
            </div>
          </section>
          <section className="db-panel db-reset-panel">
            <div>
              <h2>Restore the original demo</h2>
              <p>
                Replace your current records with the fictional dataset supplied
                with ServeBase. Download a backup first if you want to keep your
                changes.
              </p>
            </div>
            <button
              className="db-button danger"
              onClick={() => resetDialog.current?.showModal()}
            >
              Restore sample records
            </button>
          </section>
          <div className="db-storage-explainer">
            <Icon name="lock" size={18} />
            <p>
              Records are stored in your browser, not a shared server. Clearing
              browser site data removes this workspace. Export a backup before
              switching devices.
            </p>
          </div>
        </div>
      )}
      {tab === "scope" && <ProjectScope />}
      <dialog
        ref={restoreDialog}
        className="db-modal"
        aria-labelledby="db-restore-title"
      >
        <div className="db-modal-head">
          <h2 id="db-restore-title">Restore this workspace?</h2>
          <button
            className="db-icon-button"
            aria-label="Cancel backup restore"
            onClick={() => restoreDialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="db-modal-body">
          <p>
            This will replace all current records and settings with{" "}
            <strong>{pending?.name}</strong>. The backup must pass identifier
            and relationship validation.
          </p>
          <p className="db-muted">
            Download your current workspace first if you want to preserve it.
          </p>
        </div>
        <div className="db-modal-actions">
          <button
            className="db-button"
            onClick={() => restoreDialog.current?.close()}
          >
            Cancel
          </button>
          <button className="db-button primary" onClick={restore}>
            Validate & restore
          </button>
        </div>
      </dialog>
      <dialog
        ref={resetDialog}
        className="db-modal"
        aria-labelledby="db-reset-title"
      >
        <div className="db-modal-head">
          <h2 id="db-reset-title">Restore sample records?</h2>
          <button
            className="db-icon-button"
            aria-label="Cancel sample reset"
            onClick={() => resetDialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="db-modal-body">
          <p>
            All current local records, settings, and activity will be replaced
            with the original fictional demo dataset.
          </p>
          <p className="db-muted">
            This action can only be undone by restoring a backup you downloaded
            earlier.
          </p>
        </div>
        <div className="db-modal-actions">
          <button
            className="db-button"
            onClick={() => resetDialog.current?.close()}
          >
            Keep current records
          </button>
          <button
            className="db-button danger"
            onClick={() => {
              resetDemo();
              resetDialog.current?.close();
              setNotice("The original sample workspace has been restored.");
            }}
          >
            Restore sample records
          </button>
        </div>
      </dialog>
    </div>
  );
}

function ProjectScope() {
  const features = [
    "Volunteer profiles, contact details, skills, and availability",
    "Individual and institutional donor directories",
    "Contributions linked to donors, with monetary and in-kind records",
    "Drive-specific volunteer roles, attendance, and participation history",
    "Search, filters, editing, profile histories, and CSV reporting",
    "Browser persistence, validated JSON backup, and restore controls",
  ];
  return (
    <div className="db-scope-layout">
      <section className="db-panel">
        <div className="db-panel-head">
          <div>
            <h2>Implemented for the project</h2>
            <p>Features available in this browser-based academic demo.</p>
          </div>
          <span className="db-status positive">Available in demo</span>
        </div>
        <ul className="db-scope-checklist">
          {features.map((feature) => (
            <li key={feature}>
              <Icon name="check" size={17} />
              {feature}
            </li>
          ))}
        </ul>
        <div className="db-sdg-strip">
          <span>
            SDG 11<small>Sustainable communities</small>
          </span>
          <span>
            SDG 17<small>Stronger partnerships</small>
          </span>
          <span>
            SDG 1<small>Indirect outreach impact</small>
          </span>
        </div>
      </section>
      <section className="db-panel">
        <div className="db-panel-head">
          <div>
            <h2>Future platform integrations</h2>
            <p>Proposed extensions from the Community Service presentation.</p>
          </div>
          <span className="db-status neutral">Planned</span>
        </div>
        <div className="db-roadmap-list">
          {[
            {
              title: "Email & SMS follow-ups",
              detail: "Automated reminders with an approved messaging service.",
            },
            {
              title: "Connected volunteer accounts & donor portal",
              detail:
                "The local volunteer fieldbook is available. Server-backed accounts and a donor portal remain planned.",
            },
            {
              title: "Role-based accounts",
              detail:
                "Real authentication and permissions for administrators, staff, and volunteers.",
            },
            {
              title: "Cloud database & deployment",
              detail:
                "Shared records, remote backups, and cross-device collaboration.",
            },
            {
              title: "Payments & mobile application",
              detail:
                "Donation gateway integration and a dedicated mobile experience.",
            },
          ].map((item) => (
            <div key={item.title}>
              <span />
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="db-panel db-project-credits">
        <span className="db-eyebrow">K.R. MANGALAM UNIVERSITY</span>
        <h2>Volunteer and donor management project</h2>
        <p>Second Year Community Service Evaluation · ServeBase v1.0</p>
        <div>
          {["Jyoti Sharma", "Shriyashi", "Himanchal", "Anay", "Sarthak"].map(
            (name) => (
              <span key={name}>{name}</span>
            ),
          )}
        </div>
        <small>Destination Success · Academic Software Prototype</small>
      </section>
    </div>
  );
}
