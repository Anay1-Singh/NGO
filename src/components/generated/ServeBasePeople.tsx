import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Icon } from "./ServeBaseIcons";
import { ProfileAvatar, ProfilePhotoPicker } from "./ServeBaseProfilePhoto";
import {
  useWorkspace,
  newId,
  formatMoney,
  formatDate,
  downloadCsv,
  type Volunteer,
  type Donor,
  type Donation,
} from "./ServeBaseStore";
import "./ServeBasePeople.css";

type Section = "volunteers" | "donors" | "donations";
type FormValues = Record<string, string>;
type RecordItem = Volunteer | Donor | Donation;
type Errors = Record<string, string>;
const TODAY = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};
const pluralNames = {
  volunteers: "volunteers",
  donors: "donors",
  donations: "contributions",
};
const singularNames = {
  volunteers: "volunteer",
  donors: "donor",
  donations: "contribution",
};
const titles = {
  volunteers: "Volunteer directory",
  donors: "Donor directory",
  donations: "Contribution records",
};
const intros = {
  volunteers:
    "Search profiles by name or skill, filter availability, and review past assignments.",
  donors:
    "Look up individual supporters and institutional contacts, then review their contribution history.",
  donations:
    "Log monetary donations and goods received against an existing donor.",
};

function Dialog({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`db-modal people-modal${wide ? " people-modal-wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      aria-label={title}
    >
      <div className="db-modal-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="people-icon-button"
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  error,
  required,
  type = "text",
  placeholder,
  children,
  full,
  help,
  max,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  children?: ReactNode;
  full?: boolean;
  help?: string;
  max?: string;
}) {
  const id = `people-field-${name}`;
  const maxLength =
    name === "notes"
      ? 10_000
      : name === "address"
        ? 1000
        : name === "skills"
          ? 3030
          : name === "email"
            ? 254
            : name === "phone"
              ? 60
              : 200;
  const props = {
    id,
    name,
    value,
    onChange: (e: { target: { value: string } }) =>
      onChange(name, e.target.value),
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : help ? `${id}-help` : undefined,
    required,
  };
  return (
    <div className={`db-field${full ? " people-field-full" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          {...props}
          rows={3}
          maxLength={maxLength}
          placeholder={placeholder}
        />
      ) : children ? (
        <select {...props}>{children}</select>
      ) : (
        <input
          {...props}
          type={type}
          placeholder={placeholder}
          max={max}
          maxLength={maxLength}
          step={type === "number" ? "0.01" : undefined}
          min={type === "number" ? "0" : undefined}
          autoComplete={
            name === "email" ? "email" : name === "phone" ? "tel" : undefined
          }
        />
      )}
      {error ? (
        <span className="db-inline-error" id={`${id}-error`}>
          {error}
        </span>
      ) : help ? (
        <span className="people-field-help" id={`${id}-help`}>
          {help}
        </span>
      ) : null}
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return (
    <span
      className={`db-status people-status ${children === "Active" || children === "Attended" ? "people-status-positive" : ""}`}
    >
      {children}
    </span>
  );
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <div className="people-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function DetailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children || <span className="people-muted">Not provided</span>}</dd>
    </div>
  );
}
const initialForm = (section: Section, item?: RecordItem): FormValues => {
  if (section === "volunteers") {
    const v = item as Volunteer | undefined;
    return {
      name: v?.name ?? "",
      email: v?.email ?? "",
      phone: v?.phone ?? "",
      skills: v?.skills.join(", ") ?? "",
      availability: v?.availability ?? "Flexible",
      status: v?.status ?? "Active",
      joinedOn: v?.joinedOn ?? TODAY(),
      notes: v?.notes ?? "",
      photo: v?.photo ?? "",
    };
  }
  if (section === "donors") {
    const d = item as Donor | undefined;
    return {
      name: d?.name ?? "",
      email: d?.email ?? "",
      phone: d?.phone ?? "",
      type: d?.type ?? "Individual",
      address: d?.address ?? "",
      joinedOn: d?.joinedOn ?? TODAY(),
      notes: d?.notes ?? "",
    };
  }
  const d = item as Donation | undefined;
  return {
    donorId: d?.donorId ?? "",
    amount: d ? String(d.amount) : "",
    date: d?.date ?? TODAY(),
    type: d?.type ?? "Monetary",
    category: d?.category ?? "",
    notes: d?.notes ?? "",
  };
};

export function PeoplePage({
  section,
  initialSearch = "",
  openCreate = false,
}: {
  section: Section;
  initialSearch?: string;
  openCreate?: boolean;
}) {
  const { db, update } = useWorkspace();
  const [query, setQuery] = useState(initialSearch);
  const [filter, setFilter] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [form, setForm] = useState<FormValues | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  useEffect(() => {
    setQuery(initialSearch);
    setFilter("all");
    setAvailability("all");
    setDateFrom("");
    setDateTo("");
    setSort("recent");
    setPage(1);
    setForm(null);
    setDetailId(null);
    setDeleteId(null);
    setNotice("");
    setPhotoBusy(false);
  }, [section]);
  useEffect(() => {
    setQuery(initialSearch);
  }, [initialSearch]);
  useEffect(() => {
    if (openCreate) {
      setEditing(null);
      setForm(initialForm(section));
      setErrors({});
      setPhotoBusy(false);
    }
  }, [section, openCreate]);
  useEffect(() => {
    setPage(1);
  }, [query, filter, availability, dateFrom, dateTo, sort, pageSize]);
  useEffect(() => {
    setDeleteError("");
  }, [deleteId]);

  const records: RecordItem[] = db[section];
  const donorName = (id: string) =>
    db.donors.find((d) => d.id === id)?.name ?? "Unavailable donor";
  const contributions = (id: string) =>
    db.donations.filter((d) => d.donorId === id);
  const contributionTotal = (id: string) =>
    contributions(id)
      .filter((d) => d.type === "Monetary")
      .reduce((sum, d) => sum + d.amount, 0);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = records.filter((item) => {
      if (section === "volunteers") {
        const v = item as Volunteer;
        return (
          (!needle ||
            [v.name, v.email, v.phone, ...v.skills]
              .join(" ")
              .toLowerCase()
              .includes(needle)) &&
          (filter === "all" || v.status === filter) &&
          (availability === "all" || v.availability === availability)
        );
      }
      if (section === "donors") {
        const d = item as Donor;
        return (
          (!needle ||
            [d.name, d.email, d.phone, d.address]
              .join(" ")
              .toLowerCase()
              .includes(needle)) &&
          (filter === "all" || d.type === filter)
        );
      }
      const d = item as Donation;
      return (
        (!needle ||
          [donorName(d.donorId), d.category, d.notes, d.id]
            .join(" ")
            .toLowerCase()
            .includes(needle)) &&
        (filter === "all" || d.type === filter) &&
        (!dateFrom || d.date >= dateFrom) &&
        (!dateTo || d.date <= dateTo)
      );
    });
    return list.sort((a, b) => {
      const left =
        section === "donations"
          ? donorName((a as Donation).donorId)
          : (a as Volunteer | Donor).name;
      const right =
        section === "donations"
          ? donorName((b as Donation).donorId)
          : (b as Volunteer | Donor).name;
      if (sort === "name") return left.localeCompare(right);
      if (sort === "name-desc") return right.localeCompare(left);
      if (sort === "amount")
        return section === "donations"
          ? (b as Donation).amount - (a as Donation).amount
          : contributionTotal(b.id) - contributionTotal(a.id);
      const dateA =
        section === "donations"
          ? (a as Donation).date
          : (a as Volunteer | Donor).joinedOn;
      const dateB =
        section === "donations"
          ? (b as Donation).date
          : (b as Volunteer | Donor).joinedOn;
      return sort === "oldest"
        ? dateA.localeCompare(dateB)
        : dateB.localeCompare(dateA);
    });
  }, [
    records,
    db.donors,
    db.donations,
    section,
    query,
    filter,
    availability,
    dateFrom,
    dateTo,
    sort,
  ]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const shown = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const detail = records.find((r) => r.id === detailId);
  const deleting = records.find((r) => r.id === deleteId);
  const linkedCount = !deleting
    ? 0
    : section === "volunteers"
      ? db.participation.filter((p) => p.volunteerId === deleting.id).length
      : section === "donors"
        ? contributions(deleting.id).length
        : 0;
  const resetFilters = () => {
    setQuery("");
    setFilter("all");
    setAvailability("all");
    setDateFrom("");
    setDateTo("");
  };
  const hasFilters = !!(
    query ||
    filter !== "all" ||
    availability !== "all" ||
    dateFrom ||
    dateTo
  );
  const openForm = (item?: RecordItem) => {
    setEditing(item?.id ?? null);
    setForm(initialForm(section, item));
    setErrors({});
    setPhotoBusy(false);
  };
  const change = (name: string, value: string) => {
    setForm((f) => (f ? { ...f, [name]: value } : f));
    setErrors((e) => ({ ...e, [name]: "" }));
  };
  const recordLabel = (item: RecordItem) =>
    section === "donations"
      ? `${formatMoney((item as Donation).amount)} from ${donorName((item as Donation).donorId)}`
      : (item as Volunteer | Donor).name;

  const saveRecord = (event: FormEvent) => {
    event.preventDefault();
    if (!form || photoBusy) return;
    const f = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    );
    const nextErrors: Errors = {};
    const limits: Record<string, number> = {
      name: 200,
      category: 200,
      email: 254,
      phone: 60,
      address: 1000,
      notes: 10_000,
    };
    Object.entries(f).forEach(([name, value]) => {
      if (limits[name] && value.length > limits[name])
        nextErrors[name] =
          `Use no more than ${limits[name].toLocaleString("en-IN")} characters.`;
      if (/[\u0000\u0008\u000b\u000c]/.test(value))
        nextErrors[name] =
          "Remove unsupported control characters from this field.";
    });
    if (!editing && records.length >= 5000)
      nextErrors.form =
        "This directory has reached the 5,000-record local workspace limit. Remove unused records before adding more.";
    if (section !== "donations") {
      if (f.name.length < 2)
        nextErrors.name = "Enter a name with at least 2 characters.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
        nextErrors.email = "Enter a valid email address.";
      else if (
        (records as (Volunteer | Donor)[]).some(
          (r) =>
            r.id !== editing && r.email.toLowerCase() === f.email.toLowerCase(),
        )
      )
        nextErrors.email = `A ${singularNames[section]} with this email already exists.`;
      const digits = f.phone.replace(/\D/g, "");
      if (
        !/^[+\d\s().-]+$/.test(f.phone) ||
        digits.length < 7 ||
        digits.length > 15
      )
        nextErrors.phone = "Enter a valid phone number with 7–15 digits.";
      if (!isValidDate(f.joinedOn) || f.joinedOn > TODAY())
        nextErrors.joinedOn = "Choose today or an earlier date.";
      if (section === "volunteers") {
        const skills = f.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (skills.length > 30 || skills.some((s) => s.length > 100))
          nextErrors.skills =
            "Add up to 30 skills, with no more than 100 characters each.";
        if (!["Weekdays", "Weekends", "Flexible"].includes(f.availability))
          nextErrors.availability = "Choose a valid availability option.";
        if (!["Active", "Inactive"].includes(f.status))
          nextErrors.status = "Choose a valid profile status.";
      } else if (!["Individual", "Institutional"].includes(f.type))
        nextErrors.type = "Choose a valid donor type.";
    } else {
      if (!db.donors.some((d) => d.id === f.donorId))
        nextErrors.donorId = "Select a donor from the directory.";
      const amount = Number(f.amount || 0);
      if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        amount > 1_000_000_000_000 ||
        (f.type === "Monetary" && amount <= 0)
      )
        nextErrors.amount =
          f.type === "Monetary"
            ? "Enter an amount between ₹0.01 and ₹1 trillion."
            : "Enter a valid value of ₹0 or more, up to ₹1 trillion.";
      else if (f.amount && !/^\d+(\.\d{1,2})?$/.test(f.amount))
        nextErrors.amount = "Use a number with up to 2 decimal places.";
      if (!isValidDate(f.date) || f.date > TODAY())
        nextErrors.date = "Choose today or an earlier date.";
      if (!f.category)
        nextErrors.category = "Enter a purpose or contribution category.";
      if (!["Monetary", "In-kind"].includes(f.type))
        nextErrors.type = "Choose a valid contribution type.";
      if (f.type === "In-kind" && !f.notes)
        nextErrors.notes = "Describe the items and quantity received.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLInputElement>(
            '.people-modal [aria-invalid="true"]',
          )
          ?.focus(),
      );
      return;
    }
    const id =
      editing ??
      newId(
        section === "volunteers" ? "VOL" : section === "donors" ? "DNR" : "CON",
      );
    const activity = {
      title: `${editing ? "Updated" : "Added"} ${singularNames[section]}`,
      detail:
        section === "donations"
          ? `${donorName(f.donorId)} · ${f.type === "Monetary" ? formatMoney(Number(f.amount)) : f.category}`
          : f.name,
      kind:
        section === "volunteers"
          ? "volunteer"
          : section === "donors"
            ? "donor"
            : "donation",
    };
    let saved = false;
    if (section === "volunteers") {
      const uniqueSkills = new Map<string, string>();
      f.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((skill) => {
          if (!uniqueSkills.has(skill.toLowerCase()))
            uniqueSkills.set(skill.toLowerCase(), skill);
        });
      const item: Volunteer = {
        id,
        name: f.name,
        email: f.email.toLowerCase(),
        phone: f.phone,
        skills: [...uniqueSkills.values()],
        availability: f.availability as Volunteer["availability"],
        status: f.status as Volunteer["status"],
        joinedOn: f.joinedOn,
        notes: f.notes,
        photo: f.photo || undefined,
      };
      saved = update(
        (current) => ({
          ...current,
          volunteers: editing
            ? current.volunteers.map((r) => (r.id === id ? { ...r, ...item } : r))
            : [...current.volunteers, item],
        }),
        activity,
      );
    } else if (section === "donors") {
      const item: Donor = {
        id,
        name: f.name,
        type: f.type as Donor["type"],
        email: f.email.toLowerCase(),
        phone: f.phone,
        address: f.address,
        notes: f.notes,
        joinedOn: f.joinedOn,
      };
      saved = update(
        (current) => ({
          ...current,
          donors: editing
            ? current.donors.map((r) => (r.id === id ? item : r))
            : [...current.donors, item],
        }),
        activity,
      );
    } else {
      const item: Donation = {
        id,
        donorId: f.donorId,
        amount: Number(f.amount || 0),
        date: f.date,
        type: f.type as Donation["type"],
        category: f.category,
        notes: f.notes,
      };
      saved = update(
        (current) => ({
          ...current,
          donations: editing
            ? current.donations.map((r) => (r.id === id ? item : r))
            : [...current.donations, item],
        }),
        activity,
      );
    }
    if (!saved) {
      setErrors({
        form: "This change could not be saved. Check the field values and the workspace notice.",
      });
      return;
    }
    setNotice(
      `${singularNames[section][0].toUpperCase()}${singularNames[section].slice(1)} ${editing ? "updated" : "added"} successfully.`,
    );
    setForm(null);
  };

  const removeRecord = () => {
    if (!deleting || linkedCount) return;
    const label = recordLabel(deleting);
    const saved = update(
      (current) => ({
        ...current,
        [section]: current[section].filter((r) => r.id !== deleting.id),
      }),
      {
        title: `Deleted ${singularNames[section]}`,
        detail: label,
        kind:
          section === "volunteers"
            ? "volunteer"
            : section === "donors"
              ? "donor"
              : "donation",
      },
    );
    if (!saved) {
      setDeleteError(
        "This record could not be deleted. Close this dialog and check the workspace notice.",
      );
      return;
    }
    setDeleteId(null);
    setDetailId(null);
    setNotice(`${label} was deleted.`);
  };
  const archiveVolunteer = () => {
    if (!deleting || section !== "volunteers") return;
    const saved = update(
      (current) => ({
        ...current,
        volunteers: current.volunteers.map((v) =>
          v.id === deleting.id ? { ...v, status: "Inactive" as const } : v,
        ),
      }),
      {
        title: "Archived volunteer",
        detail: (deleting as Volunteer).name,
        kind: "volunteer",
      },
    );
    if (!saved) {
      setDeleteError(
        "This volunteer could not be marked inactive. Close this dialog and check the workspace notice.",
      );
      return;
    }
    setDeleteId(null);
    setNotice("Volunteer marked inactive. Participation history is preserved.");
  };
  const exportRecords = () => {
    if (!filtered.length) return;
    const rows =
      section === "volunteers"
        ? (filtered as Volunteer[]).map((v) => [
            v.id,
            v.name,
            v.email,
            v.phone,
            v.skills.join("; "),
            v.availability,
            v.status,
            v.joinedOn,
            v.notes,
          ])
        : section === "donors"
          ? (filtered as Donor[]).map((d) => [
              d.id,
              d.name,
              d.type,
              d.email,
              d.phone,
              d.address,
              d.joinedOn,
              contributionTotal(d.id),
              d.notes,
            ])
          : (filtered as Donation[]).map((d) => [
              d.id,
              d.donorId,
              donorName(d.donorId),
              d.type,
              d.amount,
              d.date,
              d.category,
              d.notes,
            ]);
    const headers =
      section === "volunteers"
        ? [
            "ID",
            "Name",
            "Email",
            "Phone",
            "Skills",
            "Availability",
            "Status",
            "Joined on",
            "Notes",
          ]
        : section === "donors"
          ? [
              "ID",
              "Name",
              "Type",
              "Email",
              "Phone",
              "Address",
              "Joined on",
              "Monetary total (INR)",
              "Notes",
            ]
          : [
              "ID",
              "Donor ID",
              "Donor",
              "Type",
              "Amount / estimated value (INR)",
              "Date",
              "Category",
              "Notes",
            ];
    downloadCsv(`servebase-${section}-${TODAY()}.csv`, headers, rows);
    update((current) => current, {
      title: "Created CSV export",
      detail: `${filtered.length} ${pluralNames[section]} · ${hasFilters ? "Filtered records" : "All records"}`,
      kind: "export",
    });
    setNotice(
      `Exported ${filtered.length} ${pluralNames[section]} using your current filters.`,
    );
  };

  return (
    <div className="people-page">
      <div className="db-page-head">
        <div>
          <span className="people-eyebrow">
            WORKSPACE /{" "}
            {section === "donations" ? "CONTRIBUTIONS" : section.toUpperCase()}
          </span>
          <h1>{titles[section]}</h1>
          <p>{intros[section]}</p>
        </div>
        <div className="people-head-actions">
          <button
            type="button"
            className="db-button"
            onClick={exportRecords}
            disabled={!filtered.length}
          >
            <Icon name="download" size={16} /> Export CSV
          </button>
          <button
            type="button"
            className="db-button primary"
            onClick={() => openForm()}
          >
            <span aria-hidden="true">＋</span> Add {singularNames[section]}
          </button>
        </div>
      </div>
      {notice && (
        <div className="people-notice" role="status">
          <Icon name="check" size={16} />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      <div className="people-metrics">
        {section === "volunteers" ? (
          <>
            <Metric
              label="Total volunteers"
              value={db.volunteers.length}
              note="Contact and skill records on file"
            />
            <Metric
              label="Active volunteers"
              value={db.volunteers.filter((v) => v.status === "Active").length}
              note="Eligible for drive registration"
            />
            <Metric
              label="Skill specialisms"
              value={
                new Set(
                  db.volunteers.flatMap((v) =>
                    v.skills.map((s) => s.toLowerCase()),
                  ),
                ).size
              }
              note="Across all volunteer profiles"
            />
            <Metric
              label="Service hours"
              value={db.participation
                .filter((p) => p.status === "Attended")
                .reduce((s, p) => s + p.hours, 0)
                .toLocaleString("en-IN")}
              note="From attended participation"
            />
          </>
        ) : section === "donors" ? (
          <>
            <Metric
              label="Registered donors"
              value={db.donors.length}
              note="Individuals and institutions on file"
            />
            <Metric
              label="Individual supporters"
              value={db.donors.filter((d) => d.type === "Individual").length}
              note="Personal contributions"
            />
            <Metric
              label="Institutional partners"
              value={db.donors.filter((d) => d.type === "Institutional").length}
              note="Organizations and foundations"
            />
            <Metric
              label="Monetary support"
              value={formatMoney(
                db.donations
                  .filter((d) => d.type === "Monetary")
                  .reduce((s, d) => s + d.amount, 0),
              )}
              note="Recorded across all donors"
            />
          </>
        ) : (
          <>
            <Metric
              label="Monetary contributions"
              value={formatMoney(
                db.donations
                  .filter((d) => d.type === "Monetary")
                  .reduce((s, d) => s + d.amount, 0),
              )}
              note="Total recorded amount in INR"
            />
            <Metric
              label="Contributions recorded"
              value={db.donations.length}
              note="Monetary and in-kind records"
            />
            <Metric
              label="In-kind contributions"
              value={db.donations.filter((d) => d.type === "In-kind").length}
              note="Goods and material support"
            />
            <Metric
              label="Contributing donors"
              value={new Set(db.donations.map((d) => d.donorId)).size}
              note="With one or more contributions"
            />
          </>
        )}
      </div>
      <section
        className="db-panel people-records"
        aria-label={`${titles[section]} records`}
      >
        <div className="people-panel-title">
          <div>
            <h2>
              {section === "donations" ? "Contribution ledger" : "All profiles"}{" "}
              <span>{records.length}</span>
            </h2>
            <p>
              {section === "donations"
                ? "Review the donor, contribution date, type, and purpose of each entry."
                : section === "volunteers"
                  ? "Contact details, practical skills, and current availability."
                  : "Individual and institutional contacts with contribution histories."}
            </p>
          </div>
          <span className="people-live-label">
            <i /> Local workspace
          </span>
        </div>
        <div className="db-toolbar people-toolbar">
          <label className="people-search">
            <Icon name="search" size={17} />
            <input
              aria-label={`Search ${pluralNames[section]}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                section === "volunteers"
                  ? "Search name, email or skill…"
                  : section === "donors"
                    ? "Search name, email or address…"
                    : "Search donor, category or reference…"
              }
            />
          </label>
          <label className="people-filter">
            <span>{section === "volunteers" ? "Status" : "Type"}</span>
            <select
              aria-label={`Filter by ${section === "volunteers" ? "status" : "type"}`}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">
                All {section === "volunteers" ? "statuses" : "types"}
              </option>
              {(section === "volunteers"
                ? ["Active", "Inactive"]
                : section === "donors"
                  ? ["Individual", "Institutional"]
                  : ["Monetary", "In-kind"]
              ).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          {section === "volunteers" && (
            <label className="people-filter">
              <span>Availability</span>
              <select
                aria-label="Filter by availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
              >
                <option value="all">All schedules</option>
                <option>Weekdays</option>
                <option>Weekends</option>
                <option>Flexible</option>
              </select>
            </label>
          )}
          <label className="people-filter">
            <span>Sort</span>
            <select
              aria-label="Sort records"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              {section !== "volunteers" && (
                <option value="amount">
                  {section === "donors"
                    ? "Highest monetary support"
                    : "Highest recorded value"}
                </option>
              )}
            </select>
          </label>
        </div>
        {section === "donations" && (
          <div className="people-date-filters">
            <span>Contribution date</span>
            <label>
              From{" "}
              <input
                aria-label="Contributions from date"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo || undefined}
              />
            </label>
            <label>
              To{" "}
              <input
                aria-label="Contributions to date"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
              />
            </label>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                className="people-text-button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear dates
              </button>
            )}
          </div>
        )}
        {hasFilters && (
          <div className="people-filter-summary">
            <span>
              {filtered.length} matching {pluralNames[section]}
            </span>
            <button
              className="people-text-button"
              type="button"
              onClick={resetFilters}
            >
              Clear all filters
            </button>
          </div>
        )}
        {shown.length ? (
          <div className="db-table-wrap">
            <table className="db-table people-table">
              <thead>
                <tr>
                  {(section === "volunteers"
                    ? [
                        "Volunteer",
                        "Skills",
                        "Availability",
                        "Status",
                        "Joined",
                        "Actions",
                      ]
                    : section === "donors"
                      ? [
                          "Donor",
                          "Type",
                          "Contact",
                          "Monetary support",
                          "Joined",
                          "Actions",
                        ]
                      : [
                          "Reference / donor",
                          "Contribution",
                          "Category",
                          "Date",
                          "Value (INR)",
                          "Actions",
                        ]
                  ).map((h) => (
                    <th scope="col" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((item) => (
                  <tr key={item.id}>
                    {section === "volunteers" ? (
                      <>
                        <td>
                          <button
                            className="people-profile-link"
                            type="button"
                            onClick={() => setDetailId(item.id)}
                          >
                            <ProfileAvatar
                              className="people-avatar"
                              name={(item as Volunteer).name}
                              photo={(item as Volunteer).photo}
                            />
                            <span>
                              <strong>{(item as Volunteer).name}</strong>
                              <small>{(item as Volunteer).email}</small>
                            </span>
                          </button>
                        </td>
                        <td>
                          <div className="people-skill-tags">
                            {(item as Volunteer).skills.slice(0, 2).map((s) => (
                              <span key={s}>{s}</span>
                            ))}
                            {(item as Volunteer).skills.length > 2 && (
                              <span
                                title={(item as Volunteer).skills
                                  .slice(2)
                                  .join(", ")}
                              >
                                +{(item as Volunteer).skills.length - 2}
                              </span>
                            )}
                            {!(item as Volunteer).skills.length && (
                              <span className="people-muted">
                                Not specified
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{(item as Volunteer).availability}</td>
                        <td>
                          <Status>{(item as Volunteer).status}</Status>
                        </td>
                        <td className="people-nowrap">
                          {formatDate((item as Volunteer).joinedOn)}
                        </td>
                      </>
                    ) : section === "donors" ? (
                      <>
                        <td>
                          <button
                            className="people-profile-link"
                            type="button"
                            onClick={() => setDetailId(item.id)}
                          >
                            <span className="people-avatar">
                              <Icon
                                name={
                                  (item as Donor).type === "Institutional"
                                    ? "building"
                                    : "heart"
                                }
                                size={17}
                              />
                            </span>
                            <span>
                              <strong>{(item as Donor).name}</strong>
                              <small>
                                {contributions(item.id).length} contribution
                                {contributions(item.id).length === 1 ? "" : "s"}
                              </small>
                            </span>
                          </button>
                        </td>
                        <td>
                          <Status>{(item as Donor).type}</Status>
                        </td>
                        <td>
                          <div className="people-contact">
                            <span>{(item as Donor).email}</span>
                            <small>{(item as Donor).phone}</small>
                          </div>
                        </td>
                        <td className="people-money">
                          {formatMoney(contributionTotal(item.id))}
                        </td>
                        <td className="people-nowrap">
                          {formatDate((item as Donor).joinedOn)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <button
                            type="button"
                            className="people-record-link"
                            onClick={() => setDetailId(item.id)}
                          >
                            <strong>
                              {donorName((item as Donation).donorId)}
                            </strong>
                            <small>{item.id}</small>
                          </button>
                        </td>
                        <td>
                          <Status>{(item as Donation).type}</Status>
                        </td>
                        <td>{(item as Donation).category}</td>
                        <td className="people-nowrap">
                          {formatDate((item as Donation).date)}
                        </td>
                        <td className="people-money">
                          {(item as Donation).amount
                            ? formatMoney((item as Donation).amount)
                            : "Not valued"}
                          {(item as Donation).type === "In-kind" && (
                            <small className="people-value-note">
                              Estimated value
                            </small>
                          )}
                        </td>
                      </>
                    )}
                    <td>
                      <div className="people-row-actions">
                        <button
                          type="button"
                          onClick={() => setDetailId(item.id)}
                          aria-label={`View ${recordLabel(item)}`}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openForm(item)}
                          aria-label={`Edit ${recordLabel(item)}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="people-delete"
                          onClick={() => setDeleteId(item.id)}
                          aria-label={`Delete ${recordLabel(item)}`}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            aria-hidden="true"
                          >
                            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="db-empty people-empty">
            <span className="people-empty-icon">
              <Icon
                name={section === "volunteers" ? "users" : "heart"}
                size={26}
              />
            </span>
            <h3>
              {hasFilters
                ? "No matching records"
                : `Your ${section === "donations" ? "contribution ledger" : "directory"} starts here`}
            </h3>
            <p>
              {hasFilters
                ? "Try a different search or clear your filters to see all records."
                : `Start by adding a ${singularNames[section]} record.`}
            </p>
            <button
              type="button"
              className="db-button"
              onClick={hasFilters ? resetFilters : () => openForm()}
            >
              {hasFilters ? "Clear filters" : `Add ${singularNames[section]}`}
            </button>
          </div>
        )}
        <div className="people-pagination">
          <p aria-live="polite">
            {filtered.length
              ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length}`
              : "0"}{" "}
            {pluralNames[section]}
          </p>
          <div>
            <label>
              Rows{" "}
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={8}>8</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
              </select>
            </label>
            <button
              type="button"
              className="db-button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              ←
            </button>
            <span>
              {currentPage} / {pageCount}
            </span>
            <button
              type="button"
              className="db-button"
              onClick={() => setPage((p) => p + 1)}
              disabled={currentPage >= pageCount}
              aria-label="Next page"
            >
              →
            </button>
          </div>
        </div>
      </section>
      <p className="people-privacy-note">
        <Icon name="shield" size={14} />{" "}
        {section === "volunteers"
          ? "Participation history stays linked when a volunteer is marked inactive."
          : section === "donors"
            ? "Donors with contribution records are protected from deletion."
            : "In-kind estimated values are kept separate from monetary totals."}
      </p>

      {form && (
        <Dialog
          title={`${editing ? "Edit" : "Add"} ${singularNames[section]}`}
          subtitle={
            section === "donations"
              ? "Choose an existing donor, then enter the date and details of the contribution."
              : "Add the contact information used for coordination and follow-up."
          }
          onClose={() => setForm(null)}
          wide
        >
          <form onSubmit={saveRecord} noValidate>
            <div className="db-modal-body">
              <p className="people-required-note">
                Fields marked * are required.
              </p>
              {errors.form && (
                <p className="db-inline-error" role="alert">
                  {errors.form}
                </p>
              )}
              {section === "volunteers" && (
                <div className="people-photo-field">
                  <ProfilePhotoPicker
                    name={form.name || "Volunteer"}
                    value={form.photo}
                    onChange={(photo) => change("photo", photo)}
                    onBusyChange={setPhotoBusy}
                  />
                </div>
              )}
              <div className="db-form-grid people-form-grid">
                {section !== "donations" ? (
                  <>
                    <FormField
                      label={
                        section === "donors" && form.type === "Institutional"
                          ? "Organization name"
                          : "Full name"
                      }
                      name="name"
                      value={form.name}
                      onChange={change}
                      error={errors.name}
                      required
                      full
                      placeholder={
                        section === "volunteers"
                          ? "e.g. Aditi Sharma"
                          : "Donor or organization name"
                      }
                    />
                    {section === "donors" && (
                      <FormField
                        label="Donor type"
                        name="type"
                        value={form.type}
                        onChange={change}
                        error={errors.type}
                        required
                      >
                        <option>Individual</option>
                        <option>Institutional</option>
                      </FormField>
                    )}
                    <FormField
                      label="Email address"
                      name="email"
                      value={form.email}
                      onChange={change}
                      error={errors.email}
                      type="email"
                      required
                      placeholder="name@example.org"
                    />
                    <FormField
                      label="Phone number"
                      name="phone"
                      value={form.phone}
                      onChange={change}
                      error={errors.phone}
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                    />
                    <FormField
                      label="Joined on"
                      name="joinedOn"
                      value={form.joinedOn}
                      onChange={change}
                      error={errors.joinedOn}
                      type="date"
                      max={TODAY()}
                      required
                    />
                    {section === "volunteers" ? (
                      <>
                        <FormField
                          label="Availability"
                          name="availability"
                          value={form.availability}
                          onChange={change}
                          error={errors.availability}
                          required
                        >
                          <option>Flexible</option>
                          <option>Weekdays</option>
                          <option>Weekends</option>
                        </FormField>
                        <FormField
                          label="Profile status"
                          name="status"
                          value={form.status}
                          onChange={change}
                          error={errors.status}
                          required
                        >
                          <option>Active</option>
                          <option>Inactive</option>
                        </FormField>
                        <FormField
                          label="Skills and specialisms"
                          name="skills"
                          value={form.skills}
                          onChange={change}
                          error={errors.skills}
                          full
                          placeholder="Teaching, First aid, Logistics"
                          help="Separate skills with commas. You can update these anytime."
                        />
                      </>
                    ) : (
                      <FormField
                        label="Address"
                        name="address"
                        value={form.address}
                        onChange={change}
                        error={errors.address}
                        full
                        placeholder="City, state or full postal address"
                      />
                    )}
                    <FormField
                      label="Internal notes"
                      name="notes"
                      value={form.notes}
                      onChange={change}
                      error={errors.notes}
                      type="textarea"
                      full
                      placeholder={
                        section === "volunteers"
                          ? "Relevant experience, interests or scheduling preferences…"
                          : "Relationship context or preferred contact arrangements…"
                      }
                    />
                  </>
                ) : (
                  <>
                    <FormField
                      label="Donor"
                      name="donorId"
                      value={form.donorId}
                      onChange={change}
                      error={errors.donorId}
                      required
                      full
                      help={
                        !db.donors.length
                          ? "Add a donor in the Donors section before recording a contribution."
                          : "Select an existing individual or institutional donor."
                      }
                    >
                      <option value="">Select a donor</option>
                      {[...db.donors]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((d) => (
                          <option value={d.id} key={d.id}>
                            {d.name} · {d.type}
                          </option>
                        ))}
                    </FormField>
                    {!db.donors.length && (
                      <a
                        href="#/admin/donors?action=add"
                        className="people-text-button people-field-full"
                        onClick={() => setForm(null)}
                      >
                        Add your first donor →
                      </a>
                    )}
                    <FormField
                      label="Contribution type"
                      name="type"
                      value={form.type}
                      onChange={change}
                      error={errors.type}
                      required
                    >
                      <option>Monetary</option>
                      <option>In-kind</option>
                    </FormField>
                    <FormField
                      label={
                        form.type === "Monetary"
                          ? "Amount received (INR)"
                          : "Estimated value (INR)"
                      }
                      name="amount"
                      value={form.amount}
                      onChange={change}
                      error={errors.amount}
                      type="number"
                      required={form.type === "Monetary"}
                      placeholder={
                        form.type === "Monetary" ? "5000.00" : "Optional"
                      }
                      help={
                        form.type === "In-kind"
                          ? "Optional; excluded from monetary totals."
                          : undefined
                      }
                    />
                    <FormField
                      label="Date received"
                      name="date"
                      value={form.date}
                      onChange={change}
                      error={errors.date}
                      type="date"
                      max={TODAY()}
                      required
                    />
                    <FormField
                      label="Purpose / category"
                      name="category"
                      value={form.category}
                      onChange={change}
                      error={errors.category}
                      required
                      placeholder="Education, Food relief, General fund…"
                    />
                    <FormField
                      label={
                        form.type === "In-kind"
                          ? "Items and quantity received"
                          : "Contribution notes"
                      }
                      name="notes"
                      value={form.notes}
                      onChange={change}
                      error={errors.notes}
                      type="textarea"
                      full
                      required={form.type === "In-kind"}
                      placeholder={
                        form.type === "In-kind"
                          ? "e.g. 50 school bags and 100 notebooks received for the education drive."
                          : "Purpose, receipt reference or additional context…"
                      }
                    />
                  </>
                )}
              </div>
            </div>
            <div className="db-modal-actions">
              <button
                type="button"
                className="db-button"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button type="submit" className="db-button primary" disabled={photoBusy}>
                {photoBusy ? "Preparing photo…" : editing ? "Save changes" : `Add ${singularNames[section]}`}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {detail && (
        <Dialog
          title={
            section === "donations"
              ? "Contribution details"
              : (detail as Volunteer | Donor).name
          }
          subtitle={detail.id}
          onClose={() => setDetailId(null)}
          wide
        >
          <div className="db-modal-body people-detail-body">
            {section === "volunteers"
              ? (() => {
                  const v = detail as Volunteer;
                  const history = db.participation.filter(
                    (p) => p.volunteerId === v.id,
                  );
                  return (
                    <>
                      <div className="people-detail-banner">
                        <ProfileAvatar
                          className="people-avatar large"
                          name={v.name}
                          photo={v.photo}
                        />
                        <div>
                          <strong>{v.name}</strong>
                          <span>{v.availability} availability</span>
                        </div>
                        <Status>{v.status}</Status>
                      </div>
                      <dl className="db-detail-grid people-detail-grid">
                        <DetailItem label="Email">{v.email}</DetailItem>
                        <DetailItem label="Phone">{v.phone}</DetailItem>
                        <DetailItem label="Joined on">
                          {formatDate(v.joinedOn)}
                        </DetailItem>
                        <DetailItem label="Service hours">
                          {history
                            .filter((p) => p.status === "Attended")
                            .reduce((s, p) => s + p.hours, 0)}{" "}
                          hours attended
                        </DetailItem>
                        <DetailItem label="Skills">
                          <div className="people-skill-tags">
                            {v.skills.length
                              ? v.skills.map((s) => <span key={s}>{s}</span>)
                              : "Not specified"}
                          </div>
                        </DetailItem>
                        <DetailItem label="Notes">
                          <span className="people-preserve">
                            {v.notes || "No internal notes."}
                          </span>
                        </DetailItem>
                      </dl>
                      <div className="people-history-head">
                        <h3>Participation history</h3>
                        <span>{history.length} assignments</span>
                      </div>
                      {history.length ? (
                        <div className="db-table-wrap">
                          <table className="db-table people-history-table">
                            <thead>
                              <tr>
                                <th>Drive / date</th>
                                <th>Assigned role</th>
                                <th>Status</th>
                                <th>Hours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...history]
                                .sort((a, b) =>
                                  (
                                    db.drives.find((d) => d.id === b.driveId)
                                      ?.date ?? ""
                                  ).localeCompare(
                                    db.drives.find((d) => d.id === a.driveId)
                                      ?.date ?? "",
                                  ),
                                )
                                .map((p) => {
                                  const drive = db.drives.find(
                                    (d) => d.id === p.driveId,
                                  );
                                  return (
                                    <tr key={p.id}>
                                      <td>
                                        <strong>
                                          {drive?.name ?? "Unavailable drive"}
                                        </strong>
                                        <small>
                                          {drive ? formatDate(drive.date) : "—"}
                                        </small>
                                      </td>
                                      <td>{p.role}</td>
                                      <td>
                                        <Status>{p.status}</Status>
                                      </td>
                                      <td>
                                        {p.status === "Attended"
                                          ? p.hours
                                          : "—"}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="people-history-empty">
                          No participation recorded yet. Assign this volunteer
                          to a drive from Participation.
                        </div>
                      )}
                    </>
                  );
                })()
              : section === "donors"
                ? (() => {
                    const d = detail as Donor;
                    const history = contributions(d.id);
                    return (
                      <>
                        <div className="people-detail-banner">
                          <span className="people-avatar large">
                            <Icon
                              name={
                                d.type === "Institutional"
                                  ? "building"
                                  : "heart"
                              }
                              size={24}
                            />
                          </span>
                          <div>
                            <strong>{d.name}</strong>
                            <span>{d.type} donor</span>
                          </div>
                        </div>
                        <dl className="db-detail-grid people-detail-grid">
                          <DetailItem label="Email">{d.email}</DetailItem>
                          <DetailItem label="Phone">{d.phone}</DetailItem>
                          <DetailItem label="Address">{d.address}</DetailItem>
                          <DetailItem label="Joined on">
                            {formatDate(d.joinedOn)}
                          </DetailItem>
                          <DetailItem label="Monetary support">
                            {formatMoney(contributionTotal(d.id))}
                          </DetailItem>
                          <DetailItem label="In-kind support">
                            {history.filter((r) => r.type === "In-kind").length}{" "}
                            contributions
                          </DetailItem>
                          <DetailItem label="Internal notes">
                            <span className="people-preserve">
                              {d.notes || "No internal notes."}
                            </span>
                          </DetailItem>
                        </dl>
                        <div className="people-history-head">
                          <h3>Contribution history</h3>
                          <span>{history.length} records</span>
                        </div>
                        {history.length ? (
                          <div className="db-table-wrap">
                            <table className="db-table people-history-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Type / purpose</th>
                                  <th>Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...history]
                                  .sort((a, b) => b.date.localeCompare(a.date))
                                  .map((r) => (
                                    <tr key={r.id}>
                                      <td>
                                        {formatDate(r.date)}
                                        <small>{r.id}</small>
                                      </td>
                                      <td>
                                        <strong>{r.category}</strong>
                                        <small>{r.type}</small>
                                        {r.notes && (
                                          <small className="people-preserve">
                                            {r.notes}
                                          </small>
                                        )}
                                      </td>
                                      <td className="people-money">
                                        {r.amount
                                          ? formatMoney(r.amount)
                                          : "Not valued"}
                                        {r.type === "In-kind" && (
                                          <small>Estimated</small>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="people-history-empty">
                            No contributions recorded yet. Add support from the
                            Contributions section.
                          </div>
                        )}
                      </>
                    );
                  })()
                : (() => {
                    const d = detail as Donation;
                    const donor = db.donors.find((r) => r.id === d.donorId);
                    return (
                      <>
                        <div className="people-contribution-amount">
                          <span>
                            {d.type === "Monetary"
                              ? "AMOUNT RECEIVED"
                              : "ESTIMATED IN-KIND VALUE"}
                          </span>
                          <strong>
                            {d.amount ? formatMoney(d.amount) : "Not valued"}
                          </strong>
                          <Status>{d.type}</Status>
                        </div>
                        <dl className="db-detail-grid people-detail-grid">
                          <DetailItem label="Donor">
                            {donor?.name ?? "Unavailable donor"}
                          </DetailItem>
                          <DetailItem label="Donor type">
                            {donor?.type}
                          </DetailItem>
                          <DetailItem label="Date received">
                            {formatDate(d.date)}
                          </DetailItem>
                          <DetailItem label="Purpose / category">
                            {d.category}
                          </DetailItem>
                          <DetailItem label="Contact email">
                            {donor?.email}
                          </DetailItem>
                          <DetailItem label="Contact phone">
                            {donor?.phone}
                          </DetailItem>
                        </dl>
                        <div className="people-detail-note">
                          <h3>
                            {d.type === "In-kind"
                              ? "Items and quantity received"
                              : "Contribution notes"}
                          </h3>
                          <p>{d.notes || "No additional notes."}</p>
                        </div>
                        {d.type === "In-kind" && (
                          <p className="people-history-empty">
                            Estimated in-kind values are excluded from monetary
                            contribution totals.
                          </p>
                        )}
                      </>
                    );
                  })()}
          </div>
          <div className="db-modal-actions">
            <button
              type="button"
              className="db-button"
              onClick={() => setDetailId(null)}
            >
              Close
            </button>
            <button
              type="button"
              className="db-button primary"
              onClick={() => {
                setDetailId(null);
                openForm(detail);
              }}
            >
              Edit {singularNames[section]}
            </button>
          </div>
        </Dialog>
      )}

      {deleting && (
        <Dialog
          title={
            linkedCount
              ? "Linked records are protected"
              : `Delete ${singularNames[section]}?`
          }
          onClose={() => setDeleteId(null)}
        >
          <div className="db-modal-body people-delete-body">
            {deleteError && (
              <p className="db-inline-error" role="alert">
                {deleteError}
              </p>
            )}
            {linkedCount ? (
              <>
                <div className="people-protected-icon">
                  <Icon name="link" size={24} />
                </div>
                <p>
                  <strong>{recordLabel(deleting)}</strong> has {linkedCount}{" "}
                  linked{" "}
                  {section === "volunteers" ? "participation" : "contribution"}{" "}
                  record{linkedCount === 1 ? "" : "s"}.
                </p>
                <p>
                  {section === "volunteers"
                    ? "Mark the volunteer inactive to remove them from active operations while preserving their service history."
                    : "This donor cannot be deleted while contributions reference their profile. Edit the profile to correct its information."}
                </p>
              </>
            ) : (
              <>
                <p>
                  This will permanently remove{" "}
                  <strong>{recordLabel(deleting)}</strong> from this local
                  workspace.
                </p>
                <p>This action cannot be undone.</p>
              </>
            )}
          </div>
          <div className="db-modal-actions">
            <button
              type="button"
              className="db-button"
              onClick={() => setDeleteId(null)}
            >
              {linkedCount ? "Keep record" : "Cancel"}
            </button>
            {linkedCount &&
            section === "volunteers" &&
            (deleting as Volunteer).status === "Active" ? (
              <button
                type="button"
                className="db-button primary"
                onClick={archiveVolunteer}
              >
                Mark inactive
              </button>
            ) : !linkedCount ? (
              <button
                type="button"
                className="db-button danger"
                onClick={removeRecord}
              >
                Delete {singularNames[section]}
              </button>
            ) : null}
          </div>
        </Dialog>
      )}
    </div>
  );
}
