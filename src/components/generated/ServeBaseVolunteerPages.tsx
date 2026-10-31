import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Icon } from "./ServeBaseIcons";
import { downloadCsv, formatDate, newId, useWorkspace } from "./ServeBaseStore";
import type { Drive, Participation, WorkspaceData } from "./ServeBaseStore";
import "./ServeBaseVolunteerPages.css";

type VolunteerPageProps = { volunteerId: string };
const portalPath = (path: string) => `#/volunteer/${path}`;
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const shortDay = (date: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
const shortMonth = (date: string) =>
  new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
const monthLabel = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
const openDrive = (drive: Drive) =>
  drive.status === "Ongoing" ||
  (drive.status === "Upcoming" && drive.date >= today());
const stateClass = (status: string) =>
  `vf-status vf-status--${status.toLowerCase()}`;
const goalNames: Record<Drive["sdg"], string> = {
  "SDG 1": "No poverty",
  "SDG 11": "Sustainable communities",
  "SDG 17": "Partnerships for the goals",
};

function registrationIssue(
  db: WorkspaceData,
  volunteerId: string,
  driveId: string,
) {
  const volunteer = db.volunteers.find((person) => person.id === volunteerId);
  const drive = db.drives.find((event) => event.id === driveId);
  if (!volunteer)
    return "Your volunteer profile is no longer available. Please speak with the coordinator.";
  if (volunteer.status !== "Active")
    return "Your profile is inactive. Ask the coordinator to reactivate it before joining a drive.";
  if (!drive)
    return "This drive is no longer available. Choose another opportunity.";
  if (drive.status === "Cancelled")
    return "This drive has been cancelled. Registration is closed.";
  if (drive.status === "Completed")
    return "This drive is completed. Registration is closed.";
  if (drive.status === "Upcoming" && drive.date < today())
    return "The recorded date has passed. Ask the coordinator to confirm the schedule before joining.";
  if (
    db.participation.some(
      (record) =>
        record.volunteerId === volunteerId && record.driveId === driveId,
    )
  )
    return "There is already a participation record for you on this drive.";
  if (
    db.participation.filter((record) => record.driveId === driveId).length >=
    drive.capacity
  )
    return "Every place is currently allocated. Check back if a place becomes available.";
  return "";
}

function DateStamp({ date, small = false }: { date: string; small?: boolean }) {
  return (
    <div
      className={`vf-date${small ? " vf-date--small" : ""}`}
      aria-label={formatDate(date)}
    >
      <span>{shortMonth(date)}</span>
      <strong>{shortDay(date)}</strong>
      <small>{date.slice(0, 4)}</small>
    </div>
  );
}

function PageEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="vf-eyebrow">
      <span aria-hidden="true" />
      {children}
    </div>
  );
}

function PageNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="vf-notice" role="status">
      <Icon name="check" size={18} />
      <span>{children}</span>
    </div>
  );
}

function VolunteerDriveDialog({
  driveId,
  volunteerId,
  onClose,
}: {
  driveId: string;
  volunteerId: string;
  onClose: () => void;
}) {
  const { db, update } = useWorkspace();
  const dialog = useRef<HTMLDialogElement>(null);
  const [role, setRole] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const drive = db.drives.find((event) => event.id === driveId);
  const own = db.participation.find(
    (record) =>
      record.driveId === driveId && record.volunteerId === volunteerId,
  );
  const volunteer = db.volunteers.find((person) => person.id === volunteerId);
  const issue = registrationIssue(db, volunteerId, driveId);
  const count = db.participation.filter(
    (record) => record.driveId === driveId,
  ).length;
  const canWithdraw =
    own?.status === "Registered" &&
    drive?.status === "Upcoming" &&
    drive.date >= today();

  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const cleanRole = role.trim();
    const cleanNote = note.trim();
    if (cleanRole.length < 2 || cleanRole.length > 120) {
      setError(
        "Tell us the role you would like to help with, using 2–120 characters.",
      );
      return;
    }
    if (
      cleanNote.length > 500 ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(cleanRole + cleanNote)
    ) {
      setError("Keep your note under 500 characters and use plain text.");
      return;
    }
    if (!confirmed) {
      setError("Please confirm that you have checked the date and location.");
      return;
    }
    let latestIssue = "";
    const saved = update(
      (current) => {
        latestIssue = registrationIssue(current, volunteerId, driveId);
        if (latestIssue) throw new Error(latestIssue);
        if (current.participation.length >= 5000) {
          latestIssue =
            "The workspace has reached its participation record limit. Ask the coordinator to archive records before joining another drive.";
          throw new Error(latestIssue);
        }
        current.participation.push({
          id: newId("par"),
          volunteerId,
          driveId,
          role: cleanRole,
          status: "Registered",
          hours: 0,
          notes: cleanNote,
        });
        return current;
      },
      {
        title: "Volunteer reserved a place",
        detail: `${volunteer?.name || "Volunteer"} joined ${drive?.name || "a drive"} as ${cleanRole}.`,
        kind: "participation",
      },
    );
    if (saved) {
      setSuccess(
        "Your place is reserved. Check the preparation notes before you set out.",
      );
      setRole("");
      setNote("");
    } else
      setError(
        latestIssue ||
          "Your place could not be reserved. Please check the details and try again.",
      );
  };

  const withdraw = () => {
    setError("");
    let latestIssue = "";
    const saved = update(
      (current) => {
        const latestRecord = current.participation.find(
          (record) =>
            record.id === own?.id &&
            record.volunteerId === volunteerId &&
            record.driveId === driveId,
        );
        const latestDrive = current.drives.find(
          (event) => event.id === driveId,
        );
        const latestVolunteer = current.volunteers.find(
          (person) => person.id === volunteerId,
        );
        if (
          !latestVolunteer ||
          latestVolunteer.status !== "Active" ||
          !latestRecord ||
          latestRecord.status !== "Registered" ||
          !latestDrive ||
          latestDrive.status !== "Upcoming" ||
          latestDrive.date < today()
        ) {
          latestIssue =
            "This reservation can no longer be withdrawn here. Please contact the coordinator.";
          throw new Error(latestIssue);
        }
        current.participation = current.participation.filter(
          (record) => record.id !== latestRecord.id,
        );
        return current;
      },
      {
        title: "Volunteer released a place",
        detail: `${volunteer?.name || "Volunteer"} withdrew their registration for ${drive?.name || "a drive"}.`,
        kind: "participation",
      },
    );
    if (saved) {
      setSuccess(
        "Your reservation has been withdrawn. That place is available to another volunteer.",
      );
      setWithdrawing(false);
      setConfirmed(false);
    } else
      setError(
        latestIssue ||
          "The reservation could not be withdrawn. Please try again.",
      );
  };

  const closeDialog = () => {
    dialog.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      className="vf-dialog"
      aria-labelledby="vf-drive-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div className="vf-dialog-paper">
        <header className="vf-dialog-header">
          <span>FIELD NOTE / {drive ? drive.sdg : "OPPORTUNITY"}</span>
          <button
            className="vf-icon-button"
            type="button"
            aria-label="Close drive details"
            onClick={closeDialog}
          >
            <Icon name="close" />
          </button>
        </header>
        {!drive ? (
          <div className="vf-dialog-body">
            <h2 id="vf-drive-title">This drive is no longer listed.</h2>
            <p>Return to the opportunity board to see the latest options.</p>
            <button className="vf-button" onClick={closeDialog}>
              Back to opportunities <Icon name="arrow" size={17} />
            </button>
          </div>
        ) : (
          <>
            <div className="vf-dialog-intro">
              <DateStamp date={drive.date} />
              <div>
                <span className={stateClass(drive.status)}>{drive.status}</span>
                <h2 id="vf-drive-title">{drive.name}</h2>
                <p>{drive.location}</p>
              </div>
            </div>
            <div className="vf-dialog-body">
              {success && <PageNotice>{success}</PageNotice>}
              <p className="vf-drive-description">
                {drive.description ||
                  "The coordinator has not added a description yet. Confirm the activities before reserving your place."}
              </p>
              <div className="vf-detail-pairs">
                <div>
                  <span>Recorded date</span>
                  <strong>{formatDate(drive.date)}</strong>
                </div>
                <div>
                  <span>Places allocated</span>
                  <strong>
                    {count} of {drive.capacity}
                  </strong>
                </div>
                <div>
                  <span>Community goal</span>
                  <strong>{goalNames[drive.sdg]}</strong>
                </div>
              </div>
              <div className="vf-practical">
                <Icon name="calendar" size={19} />
                <p>
                  <strong>Before making plans</strong>No start time or meeting
                  point is recorded in this workspace. Confirm those details
                  with the coordinator. The date and status above reflect their
                  current record.
                </p>
              </div>
              {own ? (
                <section
                  className="vf-your-place"
                  aria-labelledby="vf-own-reservation"
                >
                  <div className="vf-section-line">
                    <h3 id="vf-own-reservation">Your participation</h3>
                    <span className={stateClass(own.status)}>{own.status}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Role</dt>
                      <dd>{own.role}</dd>
                    </div>
                    <div>
                      <dt>Recorded service</dt>
                      <dd>
                        {own.status === "Attended"
                          ? `${own.hours} hours`
                          : "No attended hours recorded"}
                      </dd>
                    </div>
                  </dl>
                  <p className="vf-caption">
                    Attendance and service hours are maintained by the
                    coordinator. Contact them if a record needs correcting.
                  </p>
                  {canWithdraw && !withdrawing && (
                    <button
                      className="vf-text-button vf-text-button--rust"
                      type="button"
                      onClick={() => {
                        setWithdrawing(true);
                        setSuccess("");
                      }}
                    >
                      Release my place <Icon name="arrow" size={16} />
                    </button>
                  )}
                  {withdrawing && canWithdraw && (
                    <div className="vf-withdraw">
                      <strong>Release this reservation?</strong>
                      <p>
                        You will be removed from <b>{drive.name}</b> on{" "}
                        {formatDate(drive.date)}, including your role,{" "}
                        <b>{own.role}</b>. Your completed service history will
                        stay intact.
                      </p>
                      <div className="vf-button-row">
                        <button
                          type="button"
                          className="vf-button vf-button--rust"
                          onClick={withdraw}
                        >
                          Confirm withdrawal
                        </button>
                        <button
                          type="button"
                          className="vf-button vf-button--outline"
                          onClick={() => setWithdrawing(false)}
                        >
                          Keep my place
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              ) : issue ? (
                <div className="vf-closed-note">
                  <strong>Registration is unavailable</strong>
                  <p>{issue}</p>
                </div>
              ) : (
                <form className="vf-reservation-form" onSubmit={submit}>
                  <div className="vf-section-line">
                    <h3>Put your name down.</h3>
                    <span>01 / YOUR ROLE</span>
                  </div>
                  <p>
                    Reserve one place as <b>{volunteer?.name}</b>. Your
                    coordinator will confirm the arrangements.
                  </p>
                  <label htmlFor="vf-role">
                    How would you like to help?
                    <input
                      id="vf-role"
                      name="role"
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      maxLength={120}
                      minLength={2}
                      required
                      placeholder="For example, registration desk or logistics"
                    />
                  </label>
                  {!!volunteer?.skills.length && (
                    <div
                      className="vf-role-suggestions"
                      aria-label="Use a skill as your role"
                    >
                      {volunteer.skills.slice(0, 4).map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => setRole(skill)}
                        >
                          {skill} <span aria-hidden="true">↗</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <label htmlFor="vf-reservation-note">
                    Note for the coordinator{" "}
                    <small>Optional · {note.length}/500</small>
                    <textarea
                      id="vf-reservation-note"
                      name="note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Anything useful to know before the drive?"
                    />
                  </label>
                  <label className="vf-checkbox">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      required
                    />
                    <span>
                      I have checked the recorded date and location, and will
                      confirm the meeting arrangements.
                    </span>
                  </label>
                  <button type="submit" className="vf-button">
                    Reserve my place <Icon name="arrow" size={18} />
                  </button>
                  <p className="vf-caption">
                    This adds a Registered entry with zero hours. Service hours
                    are recorded after attendance is confirmed.
                  </p>
                </form>
              )}
              {error && (
                <p className="vf-form-error" role="alert">
                  {error}
                </p>
              )}
              <footer className="vf-dialog-contact">
                <span>Need a detail confirmed?</span>
                {db.settings.adminEmail ? (
                  <a href={`mailto:${db.settings.adminEmail}`}>
                    Email the coordinator <Icon name="arrow" size={15} />
                  </a>
                ) : (
                  <p>Contact your organisation’s coordinator directly.</p>
                )}
              </footer>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

export function VolunteerHome({ volunteerId }: VolunteerPageProps) {
  const { db } = useWorkspace();
  const [detailId, setDetailId] = useState<string | null>(null);
  const volunteer = db.volunteers.find((person) => person.id === volunteerId);
  const own = db.participation.filter(
    (record) => record.volunteerId === volunteerId,
  );
  const attended = own.filter((record) => record.status === "Attended");
  const hours = attended.reduce((sum, record) => sum + record.hours, 0);
  const assignments = own
    .filter((record) => record.status === "Registered")
    .map((record) => ({
      record,
      drive: db.drives.find((event) => event.id === record.driveId)!,
    }))
    .filter((item) => !!item.drive)
    .sort((a, b) => {
      const priority = (drive: Drive) =>
        drive.status === "Upcoming" && drive.date >= today()
          ? 0
          : drive.status === "Ongoing"
            ? 1
            : 2;
      return (
        priority(a.drive) - priority(b.drive) ||
        a.drive.date.localeCompare(b.drive.date)
      );
    });
  const next = assignments[0];
  const upcomingCount = assignments.filter(({ drive }) =>
    openDrive(drive),
  ).length;
  const last = [...attended].sort((a, b) =>
    (db.drives.find((d) => d.id === b.driveId)?.date || "").localeCompare(
      db.drives.find((d) => d.id === a.driveId)?.date || "",
    ),
  )[0];
  const lastDrive = db.drives.find((drive) => drive.id === last?.driveId);
  const available = db.drives.filter(
    (drive) =>
      openDrive(drive) && !registrationIssue(db, volunteerId, drive.id),
  ).length;
  if (!volunteer)
    return (
      <div className="vf-empty">
        <h1>Your fieldbook is unavailable.</h1>
        <p>Contact the coordinator to check your volunteer record.</p>
      </div>
    );

  return (
    <div className="vf-page vf-home">
      <header className="vf-page-heading vf-home-heading">
        <div>
          <PageEyebrow>
            YOUR FIELDBOOK / {volunteer.name.split(" ")[0].toUpperCase()}
          </PageEyebrow>
          <h1>
            Good people.
            <br />
            <em>Meaningful days.</em>
          </h1>
          <p>
            A place to plan your next contribution, keep the practical details
            close, and look back at the time you have shared.
          </p>
        </div>
        <div
          className="vf-member-seal"
          aria-label={`Volunteer since ${formatDate(volunteer.joinedOn)}`}
        >
          <span>SERVEBASE VOLUNTEER</span>
          <Icon name="heart" size={27} />
          <strong>Here to help.</strong>
          <small>
            Since {shortMonth(volunteer.joinedOn)}{" "}
            {volunteer.joinedOn.slice(0, 4)}
          </small>
        </div>
      </header>

      <section
        className="vf-service-strip"
        aria-label="Your contribution at a glance"
      >
        <div>
          <strong>
            {hours.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
            <span>h</span>
          </strong>
          <p>Attended service hours</p>
        </div>
        <div>
          <strong>{attended.length.toString().padStart(2, "0")}</strong>
          <p>Drives attended</p>
        </div>
        <div>
          <strong>{upcomingCount.toString().padStart(2, "0")}</strong>
          <p>Open-drive reservations</p>
        </div>
        <a href={portalPath("history")}>
          Read your service record <Icon name="arrow" size={20} />
        </a>
      </section>

      {volunteer.status !== "Active" && (
        <div className="vf-inactive">
          <Icon name="shield" size={21} />
          <div>
            <strong>Your profile is currently inactive.</strong>
            <p>
              You can review your history. Ask the coordinator to reactivate
              your profile before joining another drive.
            </p>
          </div>
        </div>
      )}

      <div className="vf-home-spread">
        <section className="vf-next-section" aria-labelledby="vf-next-heading">
          <div className="vf-section-line">
            <h2 id="vf-next-heading">On your calendar</h2>
            <span>01 / SHOWING UP</span>
          </div>
          {next ? (
            <article className="vf-next-ticket">
              <div className="vf-ticket-topline">
                <span>
                  {next.drive.status === "Upcoming" &&
                  next.drive.date >= today()
                    ? "YOUR NEXT COMMITMENT"
                    : next.drive.status === "Ongoing"
                      ? "ORGANIZER MARKED ONGOING"
                      : "CHECK WITH THE COORDINATOR"}
                </span>
                <Icon name="calendar" size={19} />
              </div>
              <div className="vf-next-ticket-main">
                <DateStamp date={next.drive.date} />
                <div>
                  <h3>{next.drive.name}</h3>
                  <p>{next.drive.location}</p>
                  <span className="vf-assigned-role">{next.record.role}</span>
                </div>
              </div>
              <div className="vf-ticket-bottom">
                <span className="vf-confirmed">
                  <Icon name="check" size={14} />
                  {next.drive.status === "Cancelled"
                    ? "Drive cancelled · contact coordinator"
                    : next.drive.status === "Completed"
                      ? "Attendance update needed"
                      : "Your place is reserved"}
                </span>
                <button
                  type="button"
                  onClick={() => setDetailId(next.drive.id)}
                >
                  Open my field note <Icon name="arrow" size={18} />
                </button>
              </div>
            </article>
          ) : (
            <article className="vf-next-ticket vf-next-ticket--empty">
              <span className="vf-eyebrow">AN OPEN PAGE</span>
              <h3>
                Your next good day
                <br />
                starts with a place.
              </h3>
              <p>
                No reservations on your calendar yet. Browse the current drives
                and find a useful way to take part.
              </p>
              <a
                className="vf-button vf-button--gold"
                href={portalPath("drives")}
              >
                Find an opportunity <Icon name="arrow" size={19} />
              </a>
            </article>
          )}
          {assignments.length > 1 && (
            <div className="vf-more-plans">
              {assignments.slice(1, 4).map(({ record, drive }) => (
                <button
                  type="button"
                  key={record.id}
                  onClick={() => setDetailId(drive.id)}
                >
                  <DateStamp date={drive.date} small />
                  <span>
                    <strong>{drive.name}</strong>
                    <small>
                      {record.role} · {drive.status}
                    </small>
                  </span>
                  <Icon name="arrow" size={18} />
                </button>
              ))}
              {assignments.length > 4 && (
                <a className="vf-text-button" href={portalPath("history")}>
                  See all {assignments.length} reservations{" "}
                  <Icon name="arrow" size={16} />
                </a>
              )}
            </div>
          )}
          <p className="vf-under-ticket">
            Dates come from your coordinator’s records. A reservation does not
            include a confirmed start time; check the meeting arrangements
            before travelling.
          </p>
        </section>

        <aside className="vf-pocket-note">
          <span className="vf-note-pin" aria-hidden="true" />
          <PageEyebrow>A NOTE FOR THE DAY</PageEyebrow>
          <h2>
            Bring your care.
            <br />
            We’ll organise
            <br />
            <em>the rest.</em>
          </h2>
          <p>
            Start with a drive that fits your skills and availability. A small,
            dependable commitment goes a long way.
          </p>
          <div className="vf-note-availability">
            <span>{volunteer.availability}</span>
            <small>Your recorded availability</small>
          </div>
          <a href={portalPath("drives")}>
            Explore {available} joinable {available === 1 ? "drive" : "drives"}{" "}
            <Icon name="arrow" size={20} />
          </a>
        </aside>
      </div>

      <section
        className="vf-preparation"
        aria-labelledby="vf-preparation-title"
      >
        <div className="vf-preparation-heading">
          <PageEyebrow>THE USEFUL BITS</PageEyebrow>
          <h2 id="vf-preparation-title">Before you head out.</h2>
          <p>
            A few practical checks make the day easier for you and the people
            you are helping.
          </p>
        </div>
        <div className="vf-preparation-list">
          <details open>
            <summary>
              <span>01</span>Check the plan
              <Icon name="chevron" size={17} />
            </summary>
            <p>
              Read the drive description, recorded date, and location. Ask the
              coordinator for the arrival time, meeting point, accessibility
              information, and any travel advice.
            </p>
          </details>
          <details>
            <summary>
              <span>02</span>Come prepared
              <Icon name="chevron" size={17} />
            </summary>
            <p>
              Confirm whether you need identification, water, suitable clothing,
              or specific equipment. Only bring supplies requested by the
              organiser; each drive has different needs.
            </p>
          </details>
          <details>
            <summary>
              <span>03</span>Keep your commitment clear
              <Icon name="chevron" size={17} />
            </summary>
            <p>
              If plans change, release an upcoming reservation here so another
              person can join. For an ongoing drive or a late change, contact
              the coordinator directly.
            </p>
          </details>
          <details>
            <summary>
              <span>04</span>Check your record afterwards
              <Icon name="chevron" size={17} />
            </summary>
            <p>
              The coordinator records attendance and service hours. Visit your
              service record after the drive and ask for a correction if the
              role, attendance, or hours need attention.
            </p>
          </details>
        </div>
      </section>

      <section className="vf-home-bottom">
        <div className="vf-last-entry">
          <PageEyebrow>FROM YOUR SERVICE RECORD</PageEyebrow>
          {last && lastDrive ? (
            <>
              <h2>
                {last.hours} hours.
                <br />
                <em>A day that counted.</em>
              </h2>
              <p>
                {lastDrive.name} · {formatDate(lastDrive.date)}
              </p>
              <span>{last.role}</span>
            </>
          ) : (
            <>
              <h2>
                Your first entry
                <br />
                <em>is still ahead.</em>
              </h2>
              <p>
                Attended drives and recorded hours will appear here once your
                coordinator updates your participation.
              </p>
            </>
          )}
          <a className="vf-text-button" href={portalPath("history")}>
            Open the full record <Icon name="arrow" size={17} />
          </a>
        </div>
        <div className="vf-how-it-works">
          <h3>A simple rhythm.</h3>
          <ol>
            <li>
              <span>Choose</span>
              <p>
                Read an opportunity and reserve one place with the role you
                would like to help with.
              </p>
            </li>
            <li>
              <span>Confirm</span>
              <p>
                Check the meeting arrangements with the coordinator, then show
                up ready to contribute.
              </p>
            </li>
            <li>
              <span>Reflect</span>
              <p>
                Review your recorded service and keep a personal copy when you
                need it.
              </p>
            </li>
          </ol>
        </div>
      </section>
      {detailId && (
        <VolunteerDriveDialog
          driveId={detailId}
          volunteerId={volunteerId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

export function VolunteerDrives({ volunteerId }: VolunteerPageProps) {
  const { db } = useWorkspace();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "Upcoming" | "Ongoing" | "mine">(
    "all",
  );
  const [sdg, setSdg] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const own = db.participation.filter(
    (record) => record.volunteerId === volunteerId,
  );
  const opportunities = db.drives
    .filter(
      (drive) => drive.status === "Upcoming" || drive.status === "Ongoing",
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const filtered = opportunities.filter(
    (drive) =>
      (filter === "all" ||
        (filter === "mine"
          ? own.some((record) => record.driveId === drive.id)
          : drive.status === filter)) &&
      (sdg === "all" || drive.sdg === sdg) &&
      `${drive.name} ${drive.location} ${drive.description}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );
  const mine = opportunities.filter((drive) =>
    own.some((record) => record.driveId === drive.id),
  ).length;
  const totalPlaces = opportunities
    .filter(openDrive)
    .reduce(
      (sum, drive) =>
        sum +
        Math.max(
          0,
          drive.capacity -
            db.participation.filter((record) => record.driveId === drive.id)
              .length,
        ),
      0,
    );

  return (
    <div className="vf-page vf-opportunities">
      <header className="vf-page-heading vf-opportunity-heading">
        <div>
          <PageEyebrow>THE OPPORTUNITY BOARD</PageEyebrow>
          <h1>
            Find your
            <br />
            <em>next good day.</em>
          </h1>
          <p>
            Pick a cause, check the practical details, and put your skills to
            work alongside your community.
          </p>
        </div>
        <div className="vf-board-total">
          <strong>{totalPlaces}</strong>
          <span>unallocated places</span>
          <small>across open drive records</small>
        </div>
      </header>
      <div className="vf-filter-workbench">
        <div className="vf-board-tabs" aria-label="Filter opportunities">
          {(
            [
              ["all", "All drives"],
              ["Upcoming", "Upcoming"],
              ["Ongoing", "Ongoing"],
              ["mine", `My places (${mine})`],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="vf-search-row">
          <label className="vf-search">
            <Icon name="search" size={18} />
            <span className="vf-sr-only">
              Search drives by name, location or description
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="A cause, a place, a name…"
              type="search"
            />
          </label>
          <label className="vf-select">
            <span>Community goal</span>
            <select
              value={sdg}
              onChange={(event) => setSdg(event.target.value)}
              aria-label="Filter by community goal"
            >
              <option value="all">Every goal</option>
              <option value="SDG 1">SDG 1 · No poverty</option>
              <option value="SDG 11">SDG 11 · Communities</option>
              <option value="SDG 17">SDG 17 · Partnerships</option>
            </select>
          </label>
        </div>
      </div>
      <div className="vf-board-result">
        <span>
          {filtered.length} {filtered.length === 1 ? "drive" : "drives"} on the
          board
        </span>
        <span>Dates & status supplied by the coordinator</span>
      </div>
      {filtered.length ? (
        <div className="vf-opportunity-grid">
          {filtered.map((drive, index) => {
            const record = own.find((item) => item.driveId === drive.id);
            const filled = db.participation.filter(
              (item) => item.driveId === drive.id,
            ).length;
            const remaining = Math.max(0, drive.capacity - filled);
            const issue = registrationIssue(db, volunteerId, drive.id);
            return (
              <article
                className={`vf-opportunity-ticket vf-opportunity-ticket--${index % 3}`}
                key={drive.id}
              >
                <div className="vf-opportunity-meta">
                  <span>
                    {drive.sdg} / {goalNames[drive.sdg]}
                  </span>
                  <span className={stateClass(drive.status)}>
                    {drive.status}
                  </span>
                </div>
                <div className="vf-opportunity-title">
                  <DateStamp date={drive.date} />
                  <h2>{drive.name}</h2>
                </div>
                <p className="vf-location">
                  <Icon name="globe" size={16} />
                  {drive.location}
                </p>
                <p className="vf-opportunity-copy">
                  {drive.description ||
                    "Ask your coordinator for a description of this drive."}
                </p>
                <div className="vf-places-meter">
                  <div>
                    <span>
                      {record
                        ? `Your record: ${record.status}`
                        : remaining
                          ? `${remaining} ${remaining === 1 ? "place" : "places"} unallocated`
                          : "All places allocated"}
                    </span>
                    <small>
                      {filled}/{drive.capacity}
                    </small>
                  </div>
                  <meter
                    min={0}
                    max={Math.max(1, drive.capacity)}
                    value={Math.min(filled, Math.max(1, drive.capacity))}
                    aria-label={`${filled} of ${drive.capacity} places allocated`}
                  />
                </div>
                <div className="vf-ticket-footer">
                  <small>
                    {drive.status === "Ongoing"
                      ? "Status set by the coordinator"
                      : drive.date < today()
                        ? "Recorded date has passed"
                        : "Confirm arrival time before travel"}
                  </small>
                  <button
                    type="button"
                    className={
                      record ? "vf-button vf-button--outline" : "vf-button"
                    }
                    onClick={() => setDetailId(drive.id)}
                  >
                    {record
                      ? "My field note"
                      : issue
                        ? "View details"
                        : "Read & join"}
                    <Icon name="arrow" size={17} />
                  </button>
                </div>
              </article>
            );
          })}
          <aside className="vf-board-note">
            <Icon name="book" size={29} />
            <h2>
              A place is
              <br />
              <em>a promise.</em>
            </h2>
            <p>
              Reserve only the drives you can attend. If your plans change,
              release your upcoming place so someone else can make it count.
            </p>
            <a href={portalPath("history")}>
              Review my reservations <Icon name="arrow" size={18} />
            </a>
          </aside>
        </div>
      ) : (
        <div className="vf-empty">
          <span className="vf-empty-number">∅</span>
          <h2>Nothing on this page yet.</h2>
          <p>
            {search || sdg !== "all" || filter !== "all"
              ? "Try a broader search or clear the filters to see all current drives."
              : "The coordinator has not listed an upcoming or ongoing drive. Check back for the next opportunity."}
          </p>
          {(search || sdg !== "all" || filter !== "all") && (
            <button
              type="button"
              className="vf-button vf-button--outline"
              onClick={() => {
                setSearch("");
                setSdg("all");
                setFilter("all");
              }}
            >
              Clear the board filters <Icon name="arrow" size={17} />
            </button>
          )}
        </div>
      )}
      <div className="vf-board-footnote">
        <strong>How to join</strong>
        <p>
          Open a field note, choose the role you would like to help with, and
          check the arrangements. A successful reservation appears in My places
          and your service record. Attendance and hours are recorded by the
          coordinator.
        </p>
      </div>
      {detailId && (
        <VolunteerDriveDialog
          driveId={detailId}
          volunteerId={volunteerId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

export function VolunteerHistory({ volunteerId }: VolunteerPageProps) {
  const { db, update } = useWorkspace();
  const [filter, setFilter] = useState<"all" | Participation["status"]>("all");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const volunteer = db.volunteers.find((person) => person.id === volunteerId);
  const own = db.participation.filter(
    (record) => record.volunteerId === volunteerId,
  );
  const attended = own.filter((record) => record.status === "Attended");
  const hours = attended.reduce((sum, record) => sum + record.hours, 0);
  const filtered = useMemo(
    () =>
      own
        .map((record) => ({
          record,
          drive: db.drives.find((event) => event.id === record.driveId)!,
        }))
        .filter(
          ({ record, drive }) =>
            drive &&
            (filter === "all" || record.status === filter) &&
            `${drive.name} ${drive.location} ${record.role}`
              .toLowerCase()
              .includes(search.toLowerCase().trim()),
        )
        .sort((a, b) => b.drive.date.localeCompare(a.drive.date)),
    [db, volunteerId, filter, search],
  );
  const groups = [
    ...new Set(filtered.map(({ drive }) => drive.date.slice(0, 7))),
  ];
  const exportOwn = () => {
    downloadCsv(
      `servebase-my-service-${today()}.csv`,
      [
        "Volunteer",
        "Drive",
        "Date",
        "Location",
        "Drive status",
        "Role",
        "Participation status",
        "Recorded hours",
      ],
      filtered.map(({ record, drive }) => [
        volunteer?.name || "",
        drive.name,
        drive.date,
        drive.location,
        drive.status,
        record.role,
        record.status,
        record.hours,
      ]),
    );
    setNotice(
      `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"} downloaded. This file contains only your matching service records.`,
    );
    update((current) => current, {
      title: "Volunteer service record exported",
      detail: `${volunteer?.name || "Volunteer"} downloaded ${filtered.length} of their own matching participation records.`,
      kind: "report",
    });
  };
  return (
    <div className="vf-page vf-history">
      <header className="vf-page-heading vf-history-heading">
        <div>
          <PageEyebrow>YOUR PERSONAL SERVICE RECORD</PageEyebrow>
          <h1>
            Time given.
            <br />
            <em>Stories kept.</em>
          </h1>
          <p>
            Your reservations, attended drives, and coordinator-recorded hours,
            brought together in one personal ledger.
          </p>
        </div>
        <div className="vf-service-stamp">
          <span>RECORDED CONTRIBUTION</span>
          <strong>
            {hours.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
            <small>hours</small>
          </strong>
          <p>
            {attended.length} {attended.length === 1 ? "drive" : "drives"}{" "}
            attended
          </p>
          <i aria-hidden="true">✓</i>
        </div>
      </header>
      <div className="vf-history-tools">
        <div className="vf-board-tabs" aria-label="Filter your service record">
          {(
            [
              ["all", "Every entry"],
              ["Registered", "Reserved"],
              ["Attended", "Attended"],
              ["Absent", "Absent"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
              <small>
                {value === "all"
                  ? own.length
                  : own.filter((record) => record.status === value).length}
              </small>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="vf-export-button"
          onClick={exportOwn}
          disabled={!filtered.length}
        >
          <Icon name="download" size={18} />
          <span>
            Take a copy<small>Matching entries · CSV</small>
          </span>
        </button>
      </div>
      <div className="vf-history-search">
        <label className="vf-search">
          <Icon name="search" size={18} />
          <span className="vf-sr-only">Search your service record</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a drive, location, or role"
          />
        </label>
        <span>
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"} shown
        </span>
      </div>
      {notice && <PageNotice>{notice}</PageNotice>}
      <div className="vf-ledger-layout">
        <div className="vf-ledger">
          {groups.length ? (
            groups.map((month) => (
              <section className="vf-ledger-month" key={month}>
                <h2>
                  <span>{monthLabel(`${month}-01`)}</span>
                  <small>
                    {
                      filtered.filter(({ drive }) =>
                        drive.date.startsWith(month),
                      ).length
                    }{" "}
                    entries
                  </small>
                </h2>
                {filtered
                  .filter(({ drive }) => drive.date.startsWith(month))
                  .map(({ record, drive }) => (
                    <article className="vf-ledger-entry" key={record.id}>
                      <DateStamp date={drive.date} small />
                      <div className="vf-ledger-main">
                        <div>
                          <span className={stateClass(record.status)}>
                            {record.status}
                          </span>
                          {record.status === "Registered" &&
                            (drive.status === "Completed" ||
                              drive.date < today()) && (
                              <small className="vf-awaiting">
                                Awaiting coordinator update
                              </small>
                            )}
                          {drive.status === "Cancelled" && (
                            <small className="vf-awaiting">
                              Drive cancelled
                            </small>
                          )}
                        </div>
                        <h3>{drive.name}</h3>
                        <p>{record.role}</p>
                        <small>{drive.location}</small>
                      </div>
                      <div className="vf-ledger-hours">
                        <strong>
                          {record.status === "Attended" ? record.hours : "—"}
                        </strong>
                        <span>
                          {record.status === "Attended"
                            ? "recorded hours"
                            : "no attended hours"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDetailId(drive.id)}
                        >
                          Read entry <Icon name="arrow" size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
              </section>
            ))
          ) : (
            <div className="vf-empty">
              <Icon name="book" size={31} />
              <h2>
                {own.length
                  ? "No entries match this page."
                  : "A fresh page, ready for you."}
              </h2>
              <p>
                {own.length
                  ? "Try another status or search term to find your participation record."
                  : "Reserve your first drive. Your attendance and service hours will follow once your coordinator records them."}
              </p>
              {own.length ? (
                <button
                  className="vf-button vf-button--outline"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                >
                  Show every entry <Icon name="arrow" size={17} />
                </button>
              ) : (
                <a className="vf-button" href={portalPath("drives")}>
                  Find an opportunity <Icon name="arrow" size={17} />
                </a>
              )}
            </div>
          )}
        </div>
        <aside className="vf-ledger-guide">
          <span className="vf-eyebrow">READING YOUR RECORD</span>
          <h2>
            Every entry
            <br />
            <em>has a meaning.</em>
          </h2>
          <dl>
            <div>
              <dt>
                <span className="vf-legend-dot vf-legend-dot--registered" />
                Registered
              </dt>
              <dd>
                A place is reserved. Attendance has not been recorded, so these
                entries do not add to your service total.
              </dd>
            </div>
            <div>
              <dt>
                <span className="vf-legend-dot vf-legend-dot--attended" />
                Attended
              </dt>
              <dd>
                The coordinator has recorded your attendance. Only these hours
                count towards the total above.
              </dd>
            </div>
            <div>
              <dt>
                <span className="vf-legend-dot vf-legend-dot--absent" />
                Absent
              </dt>
              <dd>
                The coordinator recorded that you did not attend. Contact them
                if that information needs correcting.
              </dd>
            </div>
          </dl>
          <div className="vf-record-help">
            <Icon name="mail" size={19} />
            <strong>Something needs a correction?</strong>
            <p>
              Include the drive name, date, and the detail you want checked.
              Your attendance and hours cannot be edited here.
            </p>
            {db.settings.adminEmail && (
              <a
                className="vf-text-button"
                href={`mailto:${db.settings.adminEmail}`}
              >
                Contact the coordinator <Icon name="arrow" size={16} />
              </a>
            )}
          </div>
          <p className="vf-caption">
            Your CSV includes only the entries matched by the filters. It is a
            personal record, not a certificate of service.
          </p>
        </aside>
      </div>
      {detailId && (
        <VolunteerDriveDialog
          driveId={detailId}
          volunteerId={volunteerId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
