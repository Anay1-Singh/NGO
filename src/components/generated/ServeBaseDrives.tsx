import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "./ServeBaseIcons";
import { useWorkspace, newId, formatDate, downloadCsv } from "./ServeBaseStore";
import type { Drive, Participation } from "./ServeBaseStore";
import "./ServeBaseDrives.css";

type Modal =
  | { kind: "drive"; id?: string }
  | { kind: "participation"; id?: string }
  | { kind: "detail"; id: string }
  | { kind: "delete-drive"; id: string }
  | { kind: "delete-participation"; id: string }
  | null;
type DriveForm = Omit<Drive, "id" | "capacity"> & { capacity: string };
type ParticipationForm = Omit<Participation, "id" | "hours"> & {
  hours: string;
};
const driveStatuses: Drive["status"][] = [
  "Upcoming",
  "Ongoing",
  "Completed",
  "Cancelled",
];
const attendanceStatuses: Participation["status"][] = [
  "Registered",
  "Attended",
  "Absent",
];
const sdgs: Drive["sdg"][] = ["SDG 1", "SDG 11", "SDG 17"];
const today = () => {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};
const blankDrive = (): DriveForm => ({
  name: "",
  date: today(),
  location: "",
  status: "Upcoming",
  description: "",
  capacity: "30",
  sdg: "SDG 11",
});
const blankParticipation = (): ParticipationForm => ({
  volunteerId: "",
  driveId: "",
  role: "",
  status: "Registered",
  hours: "0",
  notes: "",
});
const statusClass = (status: string) =>
  `drives-status drives-status--${status.toLowerCase()}`;
const hasUnsupportedCharacters = (...values: string[]) =>
  values.some((value) => /[\u0000\u0008\u000b\u000c]/.test(value));
const isCalendarDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

export function DrivesPage({
  section,
  initialSearch = "",
  openCreate = false,
}: {
  section: "drives" | "participation";
  initialSearch?: string;
  openCreate?: boolean;
}) {
  const { db, update } = useWorkspace();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState("All statuses");
  const [driveFilter, setDriveFilter] = useState("all");
  const [view, setView] = useState<"table" | "cards">("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => setPage(1), [search, status, driveFilter, section, pageSize]);
  const [modal, setModal] = useState<Modal>(null);
  const [driveForm, setDriveForm] = useState<DriveForm>(blankDrive);
  const [participationForm, setParticipationForm] =
    useState<ParticipationForm>(blankParticipation);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [backToDrive, setBackToDrive] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const isDrives = section === "drives";

  useEffect(() => {
    setSearch(initialSearch);
    setStatus("All statuses");
    setDriveFilter("all");
    setSuccess("");
    setModal(null);
  }, [section]);
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);
  useEffect(() => {
    if (!openCreate) return;
    setBackToDrive(null);
    setError("");
    if (section === "drives") {
      setDriveForm(blankDrive());
      setModal({ kind: "drive" });
    } else {
      setParticipationForm(blankParticipation());
      setModal({ kind: "participation" });
    }
  }, [openCreate, section]);
  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal();
    if (!modal && dialog.current?.open) dialog.current.close();
  }, [modal]);

  const driveById = useMemo(
    () => new Map(db.drives.map((d) => [d.id, d])),
    [db.drives],
  );
  const volunteerById = useMemo(
    () => new Map(db.volunteers.map((v) => [v.id, v])),
    [db.volunteers],
  );
  const participationByDrive = useMemo(() => {
    const grouped = new Map<string, Participation[]>();
    for (const record of db.participation) {
      const records = grouped.get(record.driveId) || [];
      records.push(record);
      grouped.set(record.driveId, records);
    }
    return grouped;
  }, [db.participation]);
  const roster = (id: string) => participationByDrive.get(id) || [];
  const filteredDrives = useMemo(
    () =>
      db.drives
        .filter((d) => {
          const text =
            `${d.name} ${d.location} ${d.description} ${d.sdg}`.toLowerCase();
          return (
            text.includes(search.toLowerCase().trim()) &&
            (status === "All statuses" || d.status === status)
          );
        })
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.name.localeCompare(b.name),
        ),
    [db.drives, search, status],
  );
  const filteredParticipation = useMemo(
    () =>
      db.participation
        .filter((p) => {
          const v = volunteerById.get(p.volunteerId);
          const d = driveById.get(p.driveId);
          const text =
            `${v?.name || ""} ${v?.email || ""} ${d?.name || ""} ${p.role} ${p.notes}`.toLowerCase();
          return (
            text.includes(search.toLowerCase().trim()) &&
            (status === "All statuses" || p.status === status) &&
            (driveFilter === "all" || p.driveId === driveFilter)
          );
        })
        .sort(
          (a, b) =>
            (driveById.get(b.driveId)?.date || "").localeCompare(
              driveById.get(a.driveId)?.date || "",
            ) ||
            (volunteerById.get(a.volunteerId)?.name || "").localeCompare(
              volunteerById.get(b.volunteerId)?.name || "",
            ),
        ),
    [db.participation, volunteerById, driveById, search, status, driveFilter],
  );
  const recordCount = isDrives
    ? filteredDrives.length
    : filteredParticipation.length;
  const pageCount = Math.max(1, Math.ceil(recordCount / pageSize));
  const currentPage = Math.min(page, pageCount);
  const shownDrives = filteredDrives.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const shownParticipation = filteredParticipation.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const activeDrives = db.drives.filter(
    (d) => d.status === "Upcoming" || d.status === "Ongoing",
  );
  const nextDrives = [...activeDrives]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const attended = db.participation.filter((p) => p.status === "Attended");
  const totalHours = attended.reduce((total, p) => total + p.hours, 0);
  const attendanceRate = db.participation.filter(
    (p) => p.status !== "Registered",
  ).length
    ? Math.round(
        (attended.length /
          db.participation.filter((p) => p.status !== "Registered").length) *
          100,
      )
    : 0;
  const detailDrive =
    modal?.kind === "detail" ? driveById.get(modal.id) : undefined;
  const deletingDrive =
    modal?.kind === "delete-drive" ? driveById.get(modal.id) : undefined;
  const deletingParticipation =
    modal?.kind === "delete-participation"
      ? db.participation.find((p) => p.id === modal.id)
      : undefined;
  const editingDrive = modal?.kind === "drive" && !!modal.id;
  const editingParticipation = modal?.kind === "participation" && !!modal.id;

  function openDrive(d?: Drive, backId?: string) {
    setDriveForm(d ? { ...d, capacity: String(d.capacity) } : blankDrive());
    setBackToDrive(backId || null);
    setError("");
    setModal({ kind: "drive", id: d?.id });
  }
  function openParticipation(
    p?: Participation,
    driveId?: string,
    backId?: string,
  ) {
    setParticipationForm(
      p
        ? { ...p, hours: String(p.hours) }
        : { ...blankParticipation(), driveId: driveId || "" },
    );
    setBackToDrive(backId || null);
    setError("");
    setModal({ kind: "participation", id: p?.id });
  }
  function closeModal() {
    setError("");
    if (
      backToDrive &&
      (modal?.kind === "drive" || modal?.kind === "participation")
    ) {
      setModal({ kind: "detail", id: backToDrive });
      setBackToDrive(null);
    } else {
      setModal(null);
      setBackToDrive(null);
    }
  }
  function saveDrive(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const capacity = Number(driveForm.capacity);
    const name = driveForm.name.trim();
    if (!name || !driveForm.location.trim() || !driveForm.date) {
      setError("Enter a drive name, date, and location before saving.");
      return;
    }
    if (!isCalendarDate(driveForm.date)) {
      setError("Enter a valid calendar date between years 0001 and 9999.");
      return;
    }
    if (
      name.length > 200 ||
      driveForm.location.trim().length > 500 ||
      driveForm.description.trim().length > 10000
    ) {
      setError(
        "Keep the drive name within 200 characters, location within 500, and description within 10,000.",
      );
      return;
    }
    if (
      hasUnsupportedCharacters(name, driveForm.location, driveForm.description)
    ) {
      setError(
        "The drive details contain an unsupported character. Remove it and try again.",
      );
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) {
      setError(
        "Capacity must be a whole number between 1 and 100,000 volunteers.",
      );
      return;
    }
    const existingId = modal?.kind === "drive" ? modal.id : undefined;
    if (!existingId && db.drives.length >= 5000) {
      setError(
        "This workspace supports up to 5,000 drives. Export a backup and remove an unused drive before adding another.",
      );
      return;
    }
    const enrolled = existingId ? roster(existingId).length : 0;
    if (capacity < enrolled) {
      setError(
        `This drive has ${enrolled} participation records. Capacity cannot be lower than its current roster.`,
      );
      return;
    }
    const next: Drive = {
      ...driveForm,
      id: existingId || newId("drive"),
      name,
      location: driveForm.location.trim(),
      description: driveForm.description.trim(),
      capacity,
    };
    const saved = update(
      (current) => ({
        ...current,
        drives: existingId
          ? current.drives.map((d) => (d.id === existingId ? next : d))
          : [...current.drives, next],
      }),
      {
        title: existingId ? "Drive updated" : "Drive created",
        detail: name,
        kind: "drive",
      },
    );
    if (saved === false) {
      setError(
        "The drive could not be saved. Check the workspace notice for details. Your entries are still available in this form.",
      );
      return;
    }
    setSuccess(`${name} ${existingId ? "updated" : "created"} successfully.`);
    closeModal();
  }
  function saveParticipation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const existingId = modal?.kind === "participation" ? modal.id : undefined;
    const previous = db.participation.find((p) => p.id === existingId);
    const v = volunteerById.get(participationForm.volunteerId);
    const d = driveById.get(participationForm.driveId);
    const role = participationForm.role.trim();
    if (!v || !d || !role) {
      setError(
        "Select a volunteer and drive, and enter the volunteer’s assigned role.",
      );
      return;
    }
    if (role.length > 200 || participationForm.notes.trim().length > 10000) {
      setError(
        "Keep the assigned role within 200 characters and participation notes within 10,000.",
      );
      return;
    }
    if (hasUnsupportedCharacters(role, participationForm.notes)) {
      setError(
        "The participation details contain an unsupported character. Remove it and try again.",
      );
      return;
    }
    if (!existingId && db.participation.length >= 5000) {
      setError(
        "This workspace supports up to 5,000 participation records. Export a backup and remove an unused record before adding another.",
      );
      return;
    }
    const isNewRegistration =
      !previous || previous.volunteerId !== v.id || previous.driveId !== d.id;
    if (isNewRegistration && v.status !== "Active") {
      setError(
        "Only active volunteers can be registered. Activate this volunteer from the volunteer directory first.",
      );
      return;
    }
    if (isNewRegistration && d.status === "Cancelled") {
      setError(
        "This drive is cancelled. Choose an active or completed drive instead.",
      );
      return;
    }
    if (
      db.participation.some(
        (p) =>
          p.id !== existingId && p.volunteerId === v.id && p.driveId === d.id,
      )
    ) {
      setError(
        `${v.name} already has a record for this drive. Edit the existing record instead.`,
      );
      return;
    }
    if (
      (!previous || previous.driveId !== d.id) &&
      roster(d.id).length >= d.capacity
    ) {
      setError(
        `This drive has reached its capacity of ${d.capacity} volunteers. Increase capacity in the drive settings before registering another volunteer.`,
      );
      return;
    }
    const rawHours = Number(participationForm.hours);
    if (
      participationForm.status === "Attended" &&
      (!participationForm.hours.trim() ||
        !Number.isFinite(rawHours) ||
        rawHours < 0 ||
        rawHours > 100000)
    ) {
      setError(
        "Enter valid service hours between 0 and 100,000 for an attended record.",
      );
      return;
    }
    const next: Participation = {
      ...participationForm,
      id: existingId || newId("participation"),
      role,
      notes: participationForm.notes.trim(),
      hours: participationForm.status === "Attended" ? rawHours : 0,
    };
    const saved = update(
      (current) => ({
        ...current,
        participation: existingId
          ? current.participation.map((p) => (p.id === existingId ? next : p))
          : [...current.participation, next],
      }),
      {
        title: existingId ? "Participation updated" : "Volunteer registered",
        detail: `${v.name} · ${d.name}`,
        kind: "participation",
      },
    );
    if (saved === false) {
      setError(
        "The participation record could not be saved. Check the workspace notice for details. Your entries are still available in this form.",
      );
      return;
    }
    setSuccess(
      `${v.name}’s ${existingId ? "participation record updated" : "registration saved"}.`,
    );
    closeModal();
  }
  function exportDrives() {
    downloadCsv(
      "servebase-drives.csv",
      [
        "Drive ID",
        "Drive",
        "Date",
        "Location",
        "Status",
        "Capacity",
        "Registered volunteers",
        "Attended",
        "Service hours",
        "SDG",
        "Description",
      ],
      filteredDrives.map((d) => {
        const people = roster(d.id);
        return [
          d.id,
          d.name,
          d.date,
          d.location,
          d.status,
          d.capacity,
          people.length,
          people.filter((p) => p.status === "Attended").length,
          people.reduce(
            (sum, p) => sum + (p.status === "Attended" ? p.hours : 0),
            0,
          ),
          d.sdg,
          d.description,
        ];
      }),
    );
    setSuccess(`${filteredDrives.length} drive records exported.`);
    update((current) => current, { title: "Drive records exported", detail: `${filteredDrives.length} matching community drives`, kind: "report" });
  }
  function exportParticipation(
    records = filteredParticipation,
    filename = "servebase-participation.csv",
  ) {
    downloadCsv(
      filename,
      [
        "Record ID",
        "Volunteer",
        "Email",
        "Drive",
        "Drive date",
        "Location",
        "Role",
        "Attendance",
        "Service hours",
        "Notes",
      ],
      records.map((p) => {
        const v = volunteerById.get(p.volunteerId);
        const d = driveById.get(p.driveId);
        return [
          p.id,
          v?.name || "Unknown volunteer",
          v?.email || "",
          d?.name || "Unknown drive",
          d?.date || "",
          d?.location || "",
          p.role,
          p.status,
          p.status === "Attended" ? p.hours : 0,
          p.notes,
        ];
      }),
    );
    setSuccess(`${records.length} participation records exported.`);
    update((current) => current, { title: "Participation exported", detail: `${records.length} matching participation records`, kind: "report" });
  }
  function deleteDrive() {
    if (!deletingDrive || roster(deletingDrive.id).length) return;
    const saved = update(
      (current) => ({
        ...current,
        drives: current.drives.filter((d) => d.id !== deletingDrive.id),
      }),
      { title: "Drive deleted", detail: deletingDrive.name, kind: "drive" },
    );
    if (saved === false) {
      setError(
        "The drive could not be deleted. Check the workspace notice for details and try again.",
      );
      return;
    }
    setSuccess(`${deletingDrive.name} deleted.`);
    setModal(null);
  }
  function deleteParticipation() {
    if (!deletingParticipation) return;
    const v = volunteerById.get(deletingParticipation.volunteerId);
    const saved = update(
      (current) => ({
        ...current,
        participation: current.participation.filter(
          (p) => p.id !== deletingParticipation.id,
        ),
      }),
      {
        title: "Participation record removed",
        detail: `${v?.name || "Volunteer"} · ${driveById.get(deletingParticipation.driveId)?.name || "Drive"}`,
        kind: "participation",
      },
    );
    if (saved === false) {
      setError(
        "The participation record could not be removed. Check the workspace notice for details and try again.",
      );
      return;
    }
    setSuccess(
      "Participation record removed. The volunteer and drive remain in your workspace.",
    );
    setModal(null);
  }
  const noFilters =
    !search && status === "All statuses" && driveFilter === "all";
  const activeFormDrive = driveById.get(participationForm.driveId);
  const selectedVolunteer = volunteerById.get(participationForm.volunteerId);
  const currentParticipation =
    modal?.kind === "participation" && modal.id
      ? db.participation.find((p) => p.id === modal.id)
      : undefined;

  return (
    <div className="drives-page">
      <header className="db-page-head">
        <div>
          <p className="db-eyebrow">
            OPERATIONS / {isDrives ? "DRIVES" : "PARTICIPATION"}
          </p>
          <h1>
            {isDrives ? "Community drives" : "Participation & attendance"}
          </h1>
          <p>
            {isDrives
              ? "Set the schedule, confirm capacity, and assign volunteers to upcoming initiatives."
              : "Review each volunteer’s assignment, attendance status, and recorded hours by drive."}
          </p>
        </div>
        <div className="drives-head-actions">
          <button
            className="db-button"
            onClick={() => (isDrives ? exportDrives() : exportParticipation())}
            disabled={
              !(isDrives ? filteredDrives.length : filteredParticipation.length)
            }
          >
            <Icon name="download" size={16} /> Export CSV
          </button>
          <button
            className="db-button primary"
            onClick={() => (isDrives ? openDrive() : openParticipation())}
          >
            <span aria-hidden="true">+</span>{" "}
            {isDrives ? "Create drive" : "Add participation"}
          </button>
        </div>
      </header>

      {success && (
        <div className="drives-success" role="status">
          <span>
            <Icon name="check" size={17} />
            {success}
          </span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setSuccess("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <div
        className="drives-summary"
        aria-label={isDrives ? "Drive overview" : "Attendance overview"}
      >
        {(isDrives
          ? [
              {
                label: "Active drives",
                value: activeDrives.length,
                note: "Upcoming and ongoing",
                icon: "calendar" as const,
              },
              {
                label: "Volunteer assignments",
                value: db.participation.length,
                note: "Across all community drives",
                icon: "users" as const,
              },
              {
                label: "Completed drives",
                value: db.drives.filter((d) => d.status === "Completed").length,
                note: "Recorded in your workspace",
                icon: "check" as const,
              },
              {
                label: "Service hours",
                value: totalHours.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                }),
                note: "From attended records",
                icon: "heart" as const,
              },
            ]
          : [
              {
                label: "Total records",
                value: db.participation.length,
                note: "Linked to volunteers and drives",
                icon: "users" as const,
              },
              {
                label: "Confirmed attendance",
                value: attended.length,
                note: `${db.participation.filter((p) => p.status === "Registered").length} awaiting attendance`,
                icon: "check" as const,
              },
              {
                label: "Service hours",
                value: totalHours.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                }),
                note: "Attended participation only",
                icon: "heart" as const,
              },
              {
                label: "Attendance rate",
                value: `${attendanceRate}%`,
                note: "Among attended and absent records",
                icon: "calendar" as const,
              },
            ]
        ).map((s) => (
          <div className="drives-summary-item" key={s.label}>
            <div>
              <span>{s.label}</span>
              <Icon name={s.icon} size={17} />
            </div>
            <strong>{s.value}</strong>
            <small>{s.note}</small>
          </div>
        ))}
      </div>

      {isDrives && nextDrives.length > 0 && (
        <section
          className="drives-next-section"
          aria-labelledby="drives-next-title"
        >
          <div className="drives-section-heading">
            <h2 id="drives-next-title">On the calendar</h2>
            <span>
              {activeDrives.length} active{" "}
              {activeDrives.length === 1 ? "initiative" : "initiatives"}
            </span>
          </div>
          <div className="drives-next-grid">
            {nextDrives.map((d) => {
              const count = roster(d.id).length;
              const percent = Math.min(100, (count / d.capacity) * 100);
              return (
                <button
                  className="drives-next-card"
                  key={d.id}
                  onClick={() => {
                    setBackToDrive(null);
                    setModal({ kind: "detail", id: d.id });
                  }}
                >
                  <div className="drives-next-meta">
                    <span>
                      <Icon name="calendar" size={14} />
                      {formatDate(d.date)}
                    </span>
                    <span className={statusClass(d.status)}>{d.status}</span>
                  </div>
                  <h3>{d.name}</h3>
                  <p>{d.location}</p>
                  <div className="drives-capacity-label">
                    <span>
                      {count} / {d.capacity} volunteers
                    </span>
                    <span>{d.sdg}</span>
                  </div>
                  <div className="drives-meter" aria-hidden="true">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section
        className="db-panel drives-record-panel"
        aria-labelledby="drives-record-title"
      >
        <div className="drives-section-heading drives-record-heading">
          <div>
            <h2 id="drives-record-title">
              {isDrives ? "Drive directory" : "Participation register"}
            </h2>
            <p>
              {isDrives
                ? "Compare schedules, status, and roster capacity across drives."
                : "One row per volunteer and drive, including role, attendance, and hours."}
            </p>
          </div>
          {isDrives && (
            <div
              className="drives-view-toggle"
              role="group"
              aria-label="Directory view"
            >
              <button
                aria-pressed={view === "table"}
                onClick={() => setView("table")}
              >
                Table
              </button>
              <button
                aria-pressed={view === "cards"}
                onClick={() => setView("cards")}
              >
                Cards
              </button>
            </div>
          )}
        </div>
        <div className="db-toolbar drives-toolbar">
          <div className="drives-search">
            <Icon name="search" size={17} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isDrives
                  ? "Search drives, locations, or SDGs…"
                  : "Search volunteers, drives, or roles…"
              }
              aria-label={
                isDrives ? "Search drives" : "Search participation records"
              }
            />
          </div>
          {!isDrives && (
            <select
              aria-label="Filter by drive"
              value={driveFilter}
              onChange={(e) => setDriveFilter(e.target.value)}
            >
              <option value="all">All drives</option>
              {db.drives.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>All statuses</option>
            {(isDrives ? driveStatuses : attendanceStatuses).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {!noFilters && (
            <button
              className="drives-clear"
              onClick={() => {
                setSearch("");
                setStatus("All statuses");
                setDriveFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="drives-results-count">
          {isDrives ? filteredDrives.length : filteredParticipation.length} of{" "}
          {isDrives ? db.drives.length : db.participation.length}{" "}
          {isDrives ? "drives" : "records"}
          {!noFilters ? " match your filters" : " in your workspace"}
        </div>

        {isDrives ? (
          filteredDrives.length === 0 ? (
            <div className="db-empty">
              <Icon name="calendar" size={30} />
              <h3>
                {noFilters
                  ? "No drives recorded"
                  : "No drives match your filters"}
              </h3>
              <p>
                {noFilters
                  ? "Create a drive with its date, location, and roster limit."
                  : "Try a different search or status to find the drive you need."}
              </p>
              <button
                className="db-button"
                onClick={() =>
                  noFilters
                    ? openDrive()
                    : (setSearch(""), setStatus("All statuses"))
                }
              >
                {noFilters ? "Create your first drive" : "Reset filters"}
              </button>
            </div>
          ) : view === "cards" ? (
            <div className="drives-directory-grid">
              {shownDrives.map((d) => {
                const people = roster(d.id);
                const hours = people.reduce(
                  (sum, p) => sum + (p.status === "Attended" ? p.hours : 0),
                  0,
                );
                return (
                  <article className="drives-directory-card" key={d.id}>
                    <div className="drives-card-top">
                      <span className={statusClass(d.status)}>{d.status}</span>
                      <span className="drives-sdg">{d.sdg}</span>
                    </div>
                    <h3>
                      <button
                        onClick={() => {
                          setBackToDrive(null);
                          setModal({ kind: "detail", id: d.id });
                        }}
                      >
                        {d.name}
                      </button>
                    </h3>
                    <p className="drives-card-description">
                      {d.description || "No description added to this drive."}
                    </p>
                    <dl>
                      <div>
                        <dt>Date</dt>
                        <dd>{formatDate(d.date)}</dd>
                      </div>
                      <div>
                        <dt>Location</dt>
                        <dd>{d.location}</dd>
                      </div>
                      <div>
                        <dt>Roster</dt>
                        <dd>
                          {people.length} / {d.capacity} volunteers
                        </dd>
                      </div>
                      <div>
                        <dt>Service hours</dt>
                        <dd>{hours.toLocaleString("en-IN")}</dd>
                      </div>
                    </dl>
                    <div className="drives-card-actions">
                      <button
                        className="db-button"
                        onClick={() => {
                          setBackToDrive(null);
                          setModal({ kind: "detail", id: d.id });
                        }}
                      >
                        View drive <Icon name="arrow" size={15} />
                      </button>
                      <button
                        className="drives-text-action"
                        onClick={() => openDrive(d)}
                      >
                        Edit
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="db-table-wrap">
              <table className="db-table drives-table">
                <thead>
                  <tr>
                    <th scope="col">Drive / initiative</th>
                    <th scope="col">Date & location</th>
                    <th scope="col">Status</th>
                    <th scope="col">Volunteer roster</th>
                    <th scope="col">SDG</th>
                    <th scope="col" className="drives-action-cell">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shownDrives.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <button
                          className="drives-name-button"
                          onClick={() => {
                            setBackToDrive(null);
                            setModal({ kind: "detail", id: d.id });
                          }}
                        >
                          {d.name}
                        </button>
                        <span className="drives-cell-sub">
                          {d.description || "Community initiative"}
                        </span>
                      </td>
                      <td>
                        <span className="drives-cell-main">
                          {formatDate(d.date)}
                        </span>
                        <span className="drives-cell-sub">{d.location}</span>
                      </td>
                      <td>
                        <span className={statusClass(d.status)}>
                          {d.status}
                        </span>
                      </td>
                      <td>
                        <span className="drives-cell-main">
                          {roster(d.id).length}{" "}
                          <span className="drives-muted">/ {d.capacity}</span>
                        </span>
                        <span className="drives-cell-sub">
                          {Math.max(0, d.capacity - roster(d.id).length)} places
                          available
                        </span>
                      </td>
                      <td>
                        <span className="drives-sdg">{d.sdg}</span>
                      </td>
                      <td className="drives-action-cell">
                        <div className="drives-row-actions">
                          <button
                            onClick={() => openDrive(d)}
                            className="drives-text-action"
                            aria-label={`Edit ${d.name}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setError("");
                              setModal({ kind: "delete-drive", id: d.id });
                            }}
                            className="drives-text-action drives-delete-action"
                            aria-label={`Delete ${d.name}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredParticipation.length === 0 ? (
          <div className="db-empty">
            <Icon name="users" size={30} />
            <h3>
              {noFilters
                ? "Build your first volunteer roster"
                : "No participation records found"}
            </h3>
            <p>
              {noFilters
                ? "Connect an active volunteer to a drive, assign their role, and record attendance when the work is done."
                : "Adjust your search, drive, or attendance filters."}
            </p>
            <button
              className="db-button"
              onClick={() =>
                noFilters
                  ? openParticipation()
                  : (setSearch(""),
                    setStatus("All statuses"),
                    setDriveFilter("all"))
              }
            >
              {noFilters ? "Add participation" : "Reset filters"}
            </button>
          </div>
        ) : (
          <div className="db-table-wrap">
            <table className="db-table drives-table drives-participation-table">
              <thead>
                <tr>
                  <th scope="col">Volunteer</th>
                  <th scope="col">Community drive</th>
                  <th scope="col">Assigned role</th>
                  <th scope="col">Attendance</th>
                  <th scope="col">Service hours</th>
                  <th scope="col" className="drives-action-cell">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {shownParticipation.map((p) => {
                  const v = volunteerById.get(p.volunteerId);
                  const d = driveById.get(p.driveId);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="drives-volunteer-cell">
                          <span className="drives-avatar" aria-hidden="true">
                            {v?.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("") || "?"}
                          </span>
                          <div>
                            <span className="drives-cell-main">
                              {v?.name || "Unknown volunteer"}
                            </span>
                            <span className="drives-cell-sub">
                              {v?.email || "Contact unavailable"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          className="drives-name-button"
                          disabled={!d}
                          onClick={() => {
                            if (d) {
                              setBackToDrive(null);
                              setModal({ kind: "detail", id: d.id });
                            }
                          }}
                        >
                          {d?.name || "Unknown drive"}
                        </button>
                        <span className="drives-cell-sub">
                          {d ? formatDate(d.date) : "Date unavailable"}
                        </span>
                      </td>
                      <td>
                        <span className="drives-cell-main">{p.role}</span>
                        {p.notes && (
                          <span className="drives-cell-sub" title={p.notes}>
                            {p.notes}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={statusClass(p.status)}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <span className="drives-hours">
                          {p.status === "Attended"
                            ? p.hours.toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })
                            : "—"}
                        </span>
                        {p.status === "Attended" && (
                          <span className="drives-cell-sub">
                            hours contributed
                          </span>
                        )}
                      </td>
                      <td className="drives-action-cell">
                        <div className="drives-row-actions">
                          <button
                            className="drives-text-action"
                            onClick={() => openParticipation(p)}
                            aria-label={`Edit ${v?.name || "volunteer"} participation`}
                          >
                            Edit
                          </button>
                          <button
                            className="drives-text-action drives-delete-action"
                            onClick={() => {
                              setError("");
                              setModal({
                                kind: "delete-participation",
                                id: p.id,
                              });
                            }}
                            aria-label={`Remove ${v?.name || "volunteer"} participation`}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="drives-pagination">
          <span aria-live="polite">
            {recordCount
              ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, recordCount)} of ${recordCount}`
              : "0"}{" "}
            {isDrives ? "drives" : "participation records"}
          </span>
          <div>
            <label>
              Rows{" "}
              <select
                aria-label="Drive rows per page"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button
              className="db-button"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ←
            </button>
            <span>
              {currentPage} / {pageCount}
            </span>
            <button
              className="db-button"
              aria-label="Next page"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((current) => current + 1)}
            >
              →
            </button>
          </div>
        </div>
        <div className="drives-panel-foot">
          <span>
            <Icon name="link" size={14} />
            {isDrives
              ? "Drive records are linked to volunteer participation."
              : "Attendance and hours update your drive records automatically."}
          </span>
          <span>CSV ready</span>
        </div>
      </section>

      <dialog
        ref={dialog}
        aria-labelledby="drives-modal-title"
        className={`db-modal drives-modal ${modal?.kind === "detail" ? "drives-detail-modal" : ""}`}
        onCancel={(e) => {
          e.preventDefault();
          closeModal();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const bounds = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < bounds.left ||
              e.clientX > bounds.right ||
              e.clientY < bounds.top ||
              e.clientY > bounds.bottom
            )
              closeModal();
          }
        }}
      >
        {modal?.kind === "drive" && (
          <form onSubmit={saveDrive}>
            <div className="db-modal-head">
              <div>
                <p className="db-eyebrow">COMMUNITY OPERATIONS</p>
                <h2 id="drives-modal-title">
                  {editingDrive
                    ? "Edit community drive"
                    : "Create community drive"}
                </h2>
                <p>Set the schedule, location, capacity, and current status.</p>
              </div>
              <button
                className="drives-close"
                type="button"
                onClick={closeModal}
                aria-label="Close drive form"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="db-modal-body">
              <div className="db-form-grid">
                <label className="db-field drives-full">
                  Drive name{" "}
                  <input
                    autoFocus
                    required
                    maxLength={200}
                    value={driveForm.name}
                    onChange={(e) =>
                      setDriveForm({ ...driveForm, name: e.target.value })
                    }
                    placeholder="e.g. Community food distribution"
                  />
                </label>
                <label className="db-field">
                  Drive date{" "}
                  <input
                    required
                    type="date"
                    min="0001-01-01"
                    max="9999-12-31"
                    value={driveForm.date}
                    onChange={(e) =>
                      setDriveForm({ ...driveForm, date: e.target.value })
                    }
                  />
                </label>
                <label className="db-field">
                  Status{" "}
                  <select
                    value={driveForm.status}
                    onChange={(e) =>
                      setDriveForm({
                        ...driveForm,
                        status: e.target.value as Drive["status"],
                      })
                    }
                  >
                    {driveStatuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="db-field drives-full">
                  Location{" "}
                  <input
                    required
                    maxLength={500}
                    value={driveForm.location}
                    onChange={(e) =>
                      setDriveForm({ ...driveForm, location: e.target.value })
                    }
                    placeholder="Venue, locality, or community"
                  />
                </label>
                <label className="db-field">
                  Volunteer capacity{" "}
                  <input
                    required
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    value={driveForm.capacity}
                    onChange={(e) =>
                      setDriveForm({ ...driveForm, capacity: e.target.value })
                    }
                  />
                  <small>Maximum number of volunteer records.</small>
                </label>
                <label className="db-field">
                  SDG alignment{" "}
                  <select
                    value={driveForm.sdg}
                    onChange={(e) =>
                      setDriveForm({
                        ...driveForm,
                        sdg: e.target.value as Drive["sdg"],
                      })
                    }
                  >
                    {sdgs.map((s) => (
                      <option key={s} value={s}>
                        {s} —{" "}
                        {s === "SDG 1"
                          ? "No Poverty"
                          : s === "SDG 11"
                            ? "Sustainable Communities"
                            : "Partnerships for the Goals"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="db-field drives-full">
                  Description <span className="drives-optional">Optional</span>
                  <textarea
                    rows={4}
                    maxLength={10000}
                    value={driveForm.description}
                    onChange={(e) =>
                      setDriveForm({
                        ...driveForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe the drive’s purpose, community needs, and volunteer responsibilities."
                  />
                </label>
              </div>
              {error && (
                <p className="db-inline-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="db-modal-actions">
              <button className="db-button" type="button" onClick={closeModal}>
                Cancel
              </button>
              <button className="db-button primary" type="submit">
                {editingDrive ? "Save changes" : "Create drive"}
              </button>
            </div>
          </form>
        )}

        {modal?.kind === "participation" && (
          <form onSubmit={saveParticipation}>
            <div className="db-modal-head">
              <div>
                <p className="db-eyebrow">VOLUNTEER PARTICIPATION</p>
                <h2 id="drives-modal-title">
                  {editingParticipation
                    ? "Edit participation record"
                    : "Register a volunteer"}
                </h2>
                <p>Select the volunteer, drive, and role before recording attendance.</p>
              </div>
              <button
                className="drives-close"
                type="button"
                onClick={closeModal}
                aria-label="Close participation form"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="db-modal-body">
              <div className="db-form-grid">
                <label className="db-field drives-full">
                  Volunteer{" "}
                  <select
                    autoFocus
                    required
                    value={participationForm.volunteerId}
                    onChange={(e) =>
                      setParticipationForm({
                        ...participationForm,
                        volunteerId: e.target.value,
                      })
                    }
                  >
                    <option value="">Select an active volunteer</option>
                    {db.volunteers
                      .filter(
                        (v) =>
                          v.status === "Active" ||
                          v.id === currentParticipation?.volunteerId,
                      )
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((v) => (
                        <option value={v.id} key={v.id}>
                          {v.name} · {v.email}
                          {v.status === "Inactive" ? " (Inactive)" : ""}
                        </option>
                      ))}
                  </select>
                  {selectedVolunteer && (
                    <small>
                      {selectedVolunteer.skills.join(" · ") ||
                        "No skills recorded"}{" "}
                      · {selectedVolunteer.availability}
                    </small>
                  )}
                  {db.volunteers.filter((v) => v.status === "Active").length ===
                    0 && (
                    <small>
                      Add an active volunteer in the volunteer directory before
                      registering.
                    </small>
                  )}
                </label>
                <label className="db-field drives-full">
                  Community drive{" "}
                  <select
                    required
                    value={participationForm.driveId}
                    onChange={(e) =>
                      setParticipationForm({
                        ...participationForm,
                        driveId: e.target.value,
                      })
                    }
                  >
                    <option value="">Select a community drive</option>
                    {[...db.drives]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((d) => (
                        <option
                          key={d.id}
                          value={d.id}
                          disabled={
                            d.status === "Cancelled" &&
                            d.id !== currentParticipation?.driveId
                          }
                        >
                          {d.name} · {formatDate(d.date)}
                          {d.status === "Cancelled" ? " (Cancelled)" : ""}
                        </option>
                      ))}
                  </select>
                </label>
                {activeFormDrive && (
                  <div className="drives-registration-context drives-full">
                    <Icon name="calendar" size={18} />
                    <div>
                      <strong>
                        {formatDate(activeFormDrive.date)} ·{" "}
                        {activeFormDrive.location}
                      </strong>
                      <span>
                        {roster(activeFormDrive.id).length} of{" "}
                        {activeFormDrive.capacity} volunteer places assigned ·{" "}
                        {activeFormDrive.status}
                      </span>
                    </div>
                  </div>
                )}
                <label className="db-field drives-full">
                  Assigned role{" "}
                  <input
                    required
                    maxLength={200}
                    value={participationForm.role}
                    onChange={(e) =>
                      setParticipationForm({
                        ...participationForm,
                        role: e.target.value,
                      })
                    }
                    placeholder="e.g. Distribution coordinator"
                  />
                </label>
                <label className="db-field">
                  Attendance{" "}
                  <select
                    value={participationForm.status}
                    onChange={(e) =>
                      setParticipationForm({
                        ...participationForm,
                        status: e.target.value as Participation["status"],
                        hours:
                          e.target.value === "Attended"
                            ? participationForm.hours
                            : "0",
                      })
                    }
                  >
                    {attendanceStatuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="db-field">
                  Service hours{" "}
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    step="any"
                    required={participationForm.status === "Attended"}
                    disabled={participationForm.status !== "Attended"}
                    value={participationForm.hours}
                    onChange={(e) =>
                      setParticipationForm({
                        ...participationForm,
                        hours: e.target.value,
                      })
                    }
                  />
                  <small>
                    {participationForm.status === "Attended"
                      ? "Record actual hours contributed."
                      : "Hours are recorded for attended volunteers only."}
                  </small>
                </label>
                <label className="db-field drives-full">
                  Participation notes{" "}
                  <span className="drives-optional">Optional</span>
                  <textarea
                    rows={3}
                    maxLength={10000}
                    value={participationForm.notes}
                    onChange={(e) =>
                      setParticipationForm({
                        ...participationForm,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Responsibilities, attendance context, or service observations."
                  />
                </label>
              </div>
              {error && (
                <p className="db-inline-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="db-modal-actions">
              <button className="db-button" type="button" onClick={closeModal}>
                Cancel
              </button>
              <button className="db-button primary" type="submit">
                {editingParticipation ? "Save record" : "Register volunteer"}
              </button>
            </div>
          </form>
        )}

        {detailDrive && (
          <>
            <div className="db-modal-head">
              <div>
                <p className="db-eyebrow">DRIVE DETAILS</p>
                <h2 id="drives-modal-title">{detailDrive.name}</h2>
                <p>
                  {formatDate(detailDrive.date)} · {detailDrive.location}
                </p>
              </div>
              <button
                className="drives-close"
                type="button"
                onClick={closeModal}
                aria-label="Close drive details"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="db-modal-body">
              <div className="drives-detail-badges">
                <span className={statusClass(detailDrive.status)}>
                  {detailDrive.status}
                </span>
                <span className="drives-sdg">{detailDrive.sdg}</span>
                <span className="drives-detail-id">{detailDrive.id}</span>
              </div>
              <p className="drives-detail-description">
                {detailDrive.description ||
                  "Add a description to share this initiative’s purpose and responsibilities."}
              </p>
              <div className="drives-detail-stats">
                <div>
                  <strong>
                    {roster(detailDrive.id).length}
                    <small> / {detailDrive.capacity}</small>
                  </strong>
                  <span>Volunteer roster</span>
                </div>
                <div>
                  <strong>
                    {
                      roster(detailDrive.id).filter(
                        (p) => p.status === "Attended",
                      ).length
                    }
                  </strong>
                  <span>Attended</span>
                </div>
                <div>
                  <strong>
                    {roster(detailDrive.id)
                      .reduce(
                        (sum, p) =>
                          sum + (p.status === "Attended" ? p.hours : 0),
                        0,
                      )
                      .toLocaleString("en-IN")}
                  </strong>
                  <span>Service hours</span>
                </div>
              </div>
              <div className="drives-section-heading drives-roster-heading">
                <div>
                  <h3>Volunteer roster</h3>
                  <p>Assigned roles and attendance for this initiative.</p>
                </div>
                <button
                  className="db-button"
                  disabled={
                    detailDrive.status === "Cancelled" ||
                    roster(detailDrive.id).length >= detailDrive.capacity
                  }
                  onClick={() =>
                    openParticipation(undefined, detailDrive.id, detailDrive.id)
                  }
                >
                  + Add volunteer
                </button>
              </div>
              {roster(detailDrive.id).length === 0 ? (
                <div className="drives-roster-empty">
                  <Icon name="users" size={26} />
                  <strong>No volunteers registered yet</strong>
                  <p>
                    {detailDrive.status === "Cancelled"
                      ? "This drive is cancelled. Update its status to register volunteers."
                      : "Add active volunteers and assign the roles needed for this drive."}
                  </p>
                </div>
              ) : (
                <div className="db-table-wrap">
                  <table className="db-table drives-roster-table">
                    <thead>
                      <tr>
                        <th scope="col">Volunteer</th>
                        <th scope="col">Role</th>
                        <th scope="col">Attendance</th>
                        <th scope="col">Hours</th>
                        <th scope="col">
                          <span className="drives-sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster(detailDrive.id).map((p) => (
                        <tr key={p.id}>
                          <td>
                            <span className="drives-cell-main">
                              {volunteerById.get(p.volunteerId)?.name ||
                                "Unknown volunteer"}
                            </span>
                            <span className="drives-cell-sub">
                              {volunteerById.get(p.volunteerId)?.email}
                            </span>
                          </td>
                          <td>{p.role}</td>
                          <td>
                            <span className={statusClass(p.status)}>
                              {p.status}
                            </span>
                          </td>
                          <td>{p.status === "Attended" ? p.hours : "—"}</td>
                          <td>
                            <button
                              className="drives-text-action"
                              onClick={() =>
                                openParticipation(p, undefined, detailDrive.id)
                              }
                              aria-label={`Edit ${volunteerById.get(p.volunteerId)?.name || "volunteer"} attendance`}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {roster(detailDrive.id).length >= detailDrive.capacity && (
                <p className="drives-capacity-note">
                  Volunteer capacity reached. Edit this drive to increase the
                  number of places.
                </p>
              )}
            </div>
            <div className="db-modal-actions drives-detail-actions">
              <button
                className="db-button"
                onClick={() =>
                  exportParticipation(
                    roster(detailDrive.id),
                    `servebase-roster-${detailDrive.id}.csv`,
                  )
                }
                disabled={roster(detailDrive.id).length === 0}
              >
                <Icon name="download" size={16} /> Export roster
              </button>
              <div>
                <button className="db-button" onClick={closeModal}>
                  Close
                </button>
                <button
                  className="db-button primary"
                  onClick={() => openDrive(detailDrive, detailDrive.id)}
                >
                  Edit drive
                </button>
              </div>
            </div>
          </>
        )}

        {deletingDrive && (
          <>
            <div className="db-modal-head">
              <div>
                <p className="db-eyebrow">DRIVE RECORD</p>
                <h2 id="drives-modal-title">
                  {roster(deletingDrive.id).length
                    ? "This drive has linked records"
                    : "Delete this drive?"}
                </h2>
              </div>
              <button
                className="drives-close"
                type="button"
                onClick={closeModal}
                aria-label="Close delete confirmation"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="db-modal-body">
              <p className="drives-delete-description">
                {roster(deletingDrive.id).length
                  ? `“${deletingDrive.name}” has ${roster(deletingDrive.id).length} participation records. Deleting it would leave volunteer attendance and service hours without a drive.`
                  : `“${deletingDrive.name}” will be permanently removed from this workspace. This action cannot be undone.`}
              </p>
              {!!roster(deletingDrive.id).length && (
                <div className="drives-linked-warning">
                  <Icon name="link" size={20} />
                  <p>
                    To preserve your records, mark the drive as completed or
                    cancelled. If this drive was created in error, remove its
                    participation records first.
                  </p>
                </div>
              )}
              {error && (
                <p className="db-inline-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="db-modal-actions">
              <button className="db-button" onClick={closeModal}>
                Keep drive
              </button>
              {roster(deletingDrive.id).length ? (
                <button
                  className="db-button primary"
                  onClick={() => {
                    setBackToDrive(null);
                    setModal({ kind: "detail", id: deletingDrive.id });
                  }}
                >
                  View linked records
                </button>
              ) : (
                <button className="db-button danger" onClick={deleteDrive}>
                  Delete drive
                </button>
              )}
            </div>
          </>
        )}

        {deletingParticipation && (
          <>
            <div className="db-modal-head">
              <div>
                <p className="db-eyebrow">PARTICIPATION RECORD</p>
                <h2 id="drives-modal-title">
                  Remove this participation record?
                </h2>
              </div>
              <button
                className="drives-close"
                type="button"
                onClick={closeModal}
                aria-label="Close removal confirmation"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="db-modal-body">
              <p className="drives-delete-description">
                Remove{" "}
                {volunteerById.get(deletingParticipation.volunteerId)?.name ||
                  "this volunteer"}{" "}
                from{" "}
                {driveById.get(deletingParticipation.driveId)?.name ||
                  "this drive"}
                ? Their assigned role, attendance, and{" "}
                {deletingParticipation.hours} service hours for this drive will
                be removed.
              </p>
              <p className="drives-muted">
                The volunteer profile and community drive will remain in your
                workspace. This action cannot be undone.
              </p>
              {error && (
                <p className="db-inline-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="db-modal-actions">
              <button className="db-button" onClick={closeModal}>
                Keep record
              </button>
              <button
                className="db-button danger"
                onClick={deleteParticipation}
              >
                Remove record
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
