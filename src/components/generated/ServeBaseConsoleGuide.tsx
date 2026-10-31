import { useEffect, useRef, useState } from "react";
import { Icon } from "./ServeBaseIcons";
import type { IconName } from "./ServeBaseIcons";

const chapters: {
  id: string;
  name: string;
  icon: IconName;
  title: string;
  intro: string;
  steps: { title: string; body: string }[];
  check: string;
  action: string;
  href: string;
}[] = [
  {
    id: "people",
    name: "People & contacts",
    icon: "users",
    title: "Start with a reliable directory.",
    intro:
      "Profiles are the source records for contributions and participation. Add them before creating those linked entries.",
    steps: [
      {
        title: "Choose the right directory",
        body: "Use Volunteers for people who give their time. Use Donor directory for individual or institutional supporters.",
      },
      {
        title: "Enter useful contact details",
        body: "Add a name, email, and phone number. For volunteers, record specific skills and choose Weekdays, Weekends, or Flexible availability.",
      },
      {
        title: "Check before you create another profile",
        body: "Search by name, email, or skill to find an existing person. Open their record to review contribution or participation history.",
      },
      {
        title: "Keep history when someone leaves",
        body: "Set a volunteer to Inactive to preserve their earlier assignments. Linked records are protected from deletion.",
      },
    ],
    check:
      "A volunteer must be Active before they can be added to a drive roster.",
    action: "Add a volunteer profile",
    href: "volunteers?action=add",
  },
  {
    id: "drives",
    name: "Drives & attendance",
    icon: "calendar",
    title: "Plan the day. Then close the record.",
    intro:
      "A drive defines the activity; participation connects each volunteer to it with a role, attendance decision, and service hours.",
    steps: [
      {
        title: "Create the drive",
        body: "Provide a name, scheduled date, location, volunteer capacity, description, status, and relevant SDG alignment.",
      },
      {
        title: "Build the roster",
        body: "Open Participation, choose an active volunteer and the drive, then enter their assigned role. Duplicate registrations and capacity limits are checked.",
      },
      {
        title: "Record what happened",
        body: "After the activity, edit each participation entry. Select Attended or Absent and enter actual hours for attendees. Registered means the attendance decision is still pending.",
      },
      {
        title: "Complete the drive and review its history",
        body: "Change the drive status to Completed when the activity is finished. Review attendance under Participation; the hours also appear in the volunteer’s history.",
      },
    ],
    check:
      "Service-hour totals include Attended records only. A drive marked Completed can still have unresolved attendance.",
    action: "Open participation",
    href: "participation",
  },
  {
    id: "contributions",
    name: "Contributions",
    icon: "heart",
    title: "Keep each contribution with its supporter.",
    intro:
      "The contribution register records what was received and when. The donor directory stores who provided it.",
    steps: [
      {
        title: "Find or create the donor",
        body: "Search Donor directory first. Choose Individual for a personal donor or Institutional for a company, trust, or other organization.",
      },
      {
        title: "Record the received contribution",
        body: "Choose the donor, contribution type, received date, amount or recorded value, purpose or category, and any useful notes.",
      },
      {
        title: "Separate money from goods",
        body: "Monetary entries contribute to cash totals. In-kind entries stay visible in the ledger but are excluded from the monetary charts and summary.",
      },
      {
        title: "Review the source record",
        body: "Open a donor’s history to see their linked contributions. Edit an incorrect contribution in the register rather than creating a second entry for the same receipt.",
      },
    ],
    check:
      "Dashboard reporting periods use the contribution’s received date. Cash and in-kind entries are displayed separately.",
    action: "Record a contribution",
    href: "donations?action=add",
  },
  {
    id: "reports",
    name: "Reports & backups",
    icon: "download",
    title: "Leave with a report you can inspect.",
    intro:
      "Choose a dataset and preview the rows before exporting. Keep a full backup when you need to preserve the complete workspace.",
    steps: [
      {
        title: "Select a dataset",
        body: "Reports & exports contains volunteers, donors, contributions, community drives, participation, and the activity log.",
      },
      {
        title: "Choose the date range",
        body: "Profile reports use joined dates; contributions and drives use their recorded dates; participation uses its linked drive date. An invalid range blocks export.",
      },
      {
        title: "Inspect the preview, then export CSV",
        body: "The preview and CSV use the same filters. CSV is suitable for offline analysis and institutional review.",
      },
      {
        title: "Keep the relationships in a full backup",
        body: "Download the JSON backup to preserve all directories and linked records. Restore it in Settings → Data & backup; the file is validated before it replaces the current workspace.",
      },
    ],
    check:
      "This evaluation build stores data in this browser. A CSV cannot restore the full workspace; use the JSON backup for that.",
    action: "Open reports & exports",
    href: "reports",
  },
];

export function ConsoleGuide({ section }: { section: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(0);
  const current = chapters[chapter];
  useEffect(() => {
    dialog.current?.close();
  }, [section]);
  function open() {
    setChapter(
      section === "drives" || section === "participation"
        ? 1
        : section === "donations"
          ? 2
          : section === "reports" || section === "settings"
            ? 3
            : 0,
    );
    dialog.current?.showModal();
  }
  return (
    <>
      <button
        className="db-icon-button cx-guide-trigger"
        aria-label="Open workspace guide"
        title="Workspace guide"
        onClick={open}
      >
        <Icon name="book" size={17} />
        <span>Guide</span>
      </button>
      <dialog
        ref={dialog}
        className="db-modal cx-guide-dialog"
        aria-labelledby="cx-guide-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const r = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < r.left ||
              event.clientX > r.right ||
              event.clientY < r.top ||
              event.clientY > r.bottom
            )
              dialog.current?.close();
          }
        }}
      >
        <header className="cx-guide-head">
          <div>
            <span className="cx-micro">SERVEBASE / WORKSPACE HANDBOOK</span>
            <h2 id="cx-guide-title">A little guidance. A better record.</h2>
            <p>Practical instructions for each part of the operations desk.</p>
          </div>
          <button
            className="db-icon-button"
            aria-label="Close workspace guide"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="cx-guide-layout">
          <div
            className="cx-guide-tabs"
            ref={tabs}
            role="tablist"
            aria-label="Workspace guide topics"
            aria-orientation="vertical"
            onKeyDown={(event) => {
              const directions: Record<string, number> = {
                ArrowDown: 1,
                ArrowRight: 1,
                ArrowUp: -1,
                ArrowLeft: -1,
              };
              let next = chapter;
              if (event.key in directions)
                next =
                  (chapter + directions[event.key] + chapters.length) %
                  chapters.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = chapters.length - 1;
              else return;
              event.preventDefault();
              setChapter(next);
              tabs.current
                ?.querySelector<HTMLButtonElement>(`[data-chapter="${next}"]`)
                ?.focus();
            }}
          >
            {chapters.map((c, i) => (
              <button
                key={c.id}
                id={`cx-guide-tab-${c.id}`}
                role="tab"
                data-chapter={i}
                aria-selected={chapter === i}
                aria-controls={`cx-guide-panel-${c.id}`}
                tabIndex={chapter === i ? 0 : -1}
                onClick={() => setChapter(i)}
              >
                <Icon name={c.icon} size={17} />
                <span>{c.name}</span>
                <small>0{i + 1}</small>
              </button>
            ))}
            <span className="cx-guide-local">
              <Icon name="lock" size={15} />
              Local evaluation workspace
            </span>
          </div>
          <section
            className="cx-guide-content"
            key={current.id}
            id={`cx-guide-panel-${current.id}`}
            role="tabpanel"
            aria-labelledby={`cx-guide-tab-${current.id}`}
            tabIndex={0}
          >
            <span className="cx-guide-chapter">
              CHAPTER 0{chapter + 1} / 04
            </span>
            <h3>{current.title}</h3>
            <p>{current.intro}</p>
            <ol>
              {current.steps.map((step, i) => (
                <li key={step.title}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h4>{step.title}</h4>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="cx-guide-check">
              <Icon name="shield" size={17} />
              <p>{current.check}</p>
            </div>
            <a
              className="cx-procedure-action"
              href={`#/admin/${current.href}`}
              onClick={() => dialog.current?.close()}
            >
              {current.action}
              <Icon name="arrow" size={16} />
            </a>
          </section>
        </div>
      </dialog>
    </>
  );
}
