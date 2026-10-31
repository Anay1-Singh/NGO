import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "./ServeBaseIcons";
import type { IconName } from "./ServeBaseIcons";
import { useWorkspace, formatDate } from "./ServeBaseStore";
import type { Volunteer } from "./ServeBaseStore";
import { VolunteerAuthPage } from "./ServeBaseVolunteerAuth";
import { VolunteerSignupPage } from "./ServeBaseVolunteerSignup";
import { ProfileAvatar, ProfilePhotoPicker } from "./ServeBaseProfilePhoto";
import { VolunteerThemeToggle } from "./ServeBaseVolunteerTheme";
import type { VolunteerTheme } from "./ServeBaseVolunteerTheme";
import { navigateServeBase } from "./ServeBaseNavigation";
import {
  VolunteerHome,
  VolunteerDrives,
  VolunteerHistory,
} from "./ServeBaseVolunteerPages";
import "./ServeBaseVolunteer.css";

const sessionKey = "servebase-volunteer-session-v1";
function readIdentity() {
  try {
    const id = sessionStorage.getItem(sessionKey);
    return id && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
const chapters: { id: string; label: string; short: string; icon: IconName }[] =
  [
    { id: "home", label: "My fieldbook", short: "Fieldbook", icon: "book" },
    { id: "drives", label: "Find a drive", short: "Discover", icon: "globe" },
    { id: "history", label: "My service", short: "My service", icon: "check" },
    { id: "profile", label: "My details", short: "My details", icon: "users" },
  ];

function FieldMark() {
  return (
    <svg
      className="vp-field-mark"
      width="31"
      height="35"
      viewBox="0 0 31 35"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15.5 29V13m0 10C5.5 23 4 17 4 10c8.5 0 11.5 4.5 11.5 13Zm0-5C25.5 18 27 12 27 5c-8.5 0-11.5 4.5-11.5 13Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 30c4.5-2 10.5-2 15 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function VolunteerExperience({
  route,
  theme,
  toggleTheme,
}: {
  route: string;
  theme: VolunteerTheme;
  toggleTheme: () => void;
}) {
  const { db } = useWorkspace();
  const [identity, setIdentity] = useState<string | null>(readIdentity);
  const [sessionNotice, setSessionNotice] = useState("");
  const path = route.replace(/^#/, "").split("?")[0].replace(/\/$/, "");
  const login = path === "/volunteer/login";
  const registration = path === "/volunteer/register";
  const volunteer = db.volunteers.find(
    (v) => v.id === identity && v.status === "Active",
  );
  useEffect(() => {
    if (identity && !volunteer) {
      try {
        sessionStorage.removeItem(sessionKey);
      } catch {
        /* The session also closes in memory. */
      }
      setIdentity(null);
      setSessionNotice(
        "That volunteer profile is no longer active. Choose an active profile to open a fieldbook.",
      );
    }
    if (!login && !registration && !volunteer) window.location.hash = "/volunteer/login";
  }, [identity, volunteer?.id, login, registration]);
  useEffect(() => {
    if (login) document.title = "Volunteer sign in — ServeBase Fieldbook";
  }, [login]);
  function enter(id: string) {
    if (!db.volunteers.some((v) => v.id === id && v.status === "Active")) {
      setSessionNotice(
        "Choose a current, active volunteer profile to continue.",
      );
      return;
    }
    openIdentity(id);
  }
  function openIdentity(id: string) {
    try {
      sessionStorage.setItem(sessionKey, id);
    } catch {
      /* Demo entry remains usable in this tab. */
    }
    setIdentity(id);
    setSessionNotice("");
    window.location.hash = "/volunteer/home";
  }
  function leave() {
    try {
      sessionStorage.removeItem(sessionKey);
    } catch {
      /* Also cleared from memory below. */
    }
    navigateServeBase("/volunteer/login", () => setIdentity(null));
  }
  if (login || registration || !volunteer)
    return (
      <div className="vp vp-login" data-theme={theme}>
        {sessionNotice && (
          <div className="vp-session-notice" role="status">
            {sessionNotice}
          </div>
        )}
        {registration ? <VolunteerSignupPage
          onCreated={openIdentity}
          theme={theme}
          toggleTheme={toggleTheme}
        /> : <VolunteerAuthPage
          onLogin={enter}
          theme={theme}
          toggleTheme={toggleTheme}
        />}
      </div>
    );
  return (
    <VolunteerFieldbook
      route={route}
      volunteer={volunteer}
      onLogout={leave}
      theme={theme}
      toggleTheme={toggleTheme}
    />
  );
}

function VolunteerFieldbook({
  route,
  volunteer,
  onLogout,
  theme,
  toggleTheme,
}: {
  route: string;
  volunteer: Volunteer;
  onLogout: () => void;
  theme: VolunteerTheme;
  toggleTheme: () => void;
}) {
  const { storageError } = useWorkspace();
  const guide = useRef<HTMLDialogElement>(null);
  const raw = route
    .replace(/^#\/volunteer\/?/, "")
    .split("?")[0]
    .replace(/\/$/, "");
  const section = raw === "" || raw === "dashboard" ? "home" : raw;
  const current = chapters.find((c) => c.id === section);
  useEffect(() => {
    document.title = `${current?.label || "Page not found"} — ServeBase Fieldbook`;
    guide.current?.close();
  }, [section, current?.label]);
  return (
    <div className="vp vp-fieldbook" data-theme={theme}>
      <a
        className="vp-skip"
        href="#vp-main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("vp-main")?.focus();
        }}
      >
        Skip to my fieldbook
      </a>
      <header className="vp-masthead">
        <a
          className="vp-brand"
          href="#/volunteer/home"
          aria-label="ServeBase volunteer fieldbook"
        >
          <FieldMark />
          <span>
            ServeBase<small>A volunteer’s fieldbook</small>
          </span>
        </a>
        <span className="vp-masthead-note">
          A little time.
          <br />
          <em>A place to make it count.</em>
        </span>
        <div className="vp-member">
          <span className="vp-demo-stamp">LOCAL DEMO</span>
          <VolunteerThemeToggle theme={theme} onToggle={toggleTheme} />
          <a
            href="#/volunteer/profile"
            aria-label={`My profile: ${volunteer.name}`}
          >
            <ProfileAvatar className="vp-member-monogram" name={volunteer.name} photo={volunteer.photo} />
            <span>
              {volunteer.name.split(" ")[0]}
              <small>Volunteer member</small>
            </span>
            <Icon name="chevron" size={13} />
          </a>
          <button className="vp-close-book" onClick={onLogout}>
            Sign out
            <Icon name="arrow" size={14} />
          </button>
        </div>
      </header>
      <div className="vp-chapter-line">
        <span className="vp-edition">YOUR COMMUNITY / YOUR CHAPTER</span>
        <nav className="vp-chapters" aria-label="Volunteer navigation">
          {chapters.map((c, i) => (
            <a
              href={`#/volunteer/${c.id}`}
              key={c.id}
              aria-current={section === c.id ? "page" : undefined}
            >
              <span className="vp-chapter-index">0{i + 1}</span>
              <Icon name={c.icon} size={17} />
              <span className="vp-chapter-label">{c.label}</span>
              <span className="vp-chapter-short">{c.short}</span>
            </a>
          ))}
        </nav>
        <button
          className="vp-guide-open"
          onClick={() => guide.current?.showModal()}
          aria-label="Open volunteer guide"
        >
          <span>?</span>
          <b>Field guide</b>
        </button>
      </div>
      {storageError && (
        <div className="vp-storage-alert" role="alert">
          <Icon name="shield" size={19} />
          <p>
            {storageError} Ask your coordinator to export a backup before
            closing this tab.
          </p>
        </div>
      )}
      <main id="vp-main" className="vp-main" key={section} tabIndex={-1}>
        {section === "home" && <VolunteerHome volunteerId={volunteer.id} />}
        {section === "drives" && <VolunteerDrives volunteerId={volunteer.id} />}
        {section === "history" && (
          <VolunteerHistory volunteerId={volunteer.id} />
        )}
        {section === "profile" && (
          <VolunteerProfile volunteerId={volunteer.id} />
        )}
        {!current && (
          <section className="vp-lost-page">
            <span>AN UNWRITTEN PAGE</span>
            <h1>This chapter hasn’t been written.</h1>
            <p>
              Your schedule, opportunities, and service record are still in your
              fieldbook.
            </p>
            <a className="vp-solid-button" href="#/volunteer/home">
              Back to my fieldbook
              <Icon name="arrow" size={17} />
            </a>
          </section>
        )}
      </main>
      <footer className="vp-colophon">
        <a href="#/">
          <FieldMark />
          <span>
            Made for people
            <br />
            who show up.
          </span>
        </a>
        <p>
          Your profile and participation use the same local records as the
          coordinator’s workspace.
          <br />
          <span>This is a browser-based evaluation demo.</span>
        </p>
        <div>
          <button onClick={() => guide.current?.showModal()}>
            Read the field guide
            <Icon name="book" size={14} />
          </button>
          <a href="#/">
            Visit ServeBase
            <Icon name="arrow" size={14} />
          </a>
          <a href="#/terms">Terms &amp; Conditions</a>
        </div>
      </footer>
      <dialog
        className="vp-dialog vp-guide-dialog"
        ref={guide}
        aria-labelledby="vp-guide-title"
      >
        <header>
          <span>KEEP THIS PAGE HANDY</span>
          <button
            aria-label="Close volunteer guide"
            onClick={() => guide.current?.close()}
          >
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="vp-guide-content">
          <h2 id="vp-guide-title">
            A few things to know
            <br />
            <em>before you head out.</em>
          </h2>
          <details open>
            <summary>
              How do I join a drive?<span>01</span>
            </summary>
            <p>
              Open Find a drive, choose an available activity, and read its
              date, location, and capacity. Select your role before registering.
              Your name then appears on that drive’s roster.
            </p>
            <a href="#/volunteer/drives" onClick={() => guide.current?.close()}>
              Find an opportunity
              <Icon name="arrow" size={14} />
            </a>
          </details>
          <details>
            <summary>
              Who records my service hours?<span>02</span>
            </summary>
            <p>
              The coordinator records attendance and actual service hours after
              the activity. My service shows those recorded results. A
              registration is a place on the roster; it is not a completed
              service record or a certificate.
            </p>
          </details>
          <details>
            <summary>
              What can I change about my profile?<span>03</span>
            </summary>
            <p>
              You can update your name, contact details, skills, and
              availability under My details. Your member ID, joining date,
              account status, and coordinator’s internal notes stay with the
              source record.
            </p>
          </details>
          <details>
            <summary>
              Where is this information saved?<span>04</span>
            </summary>
            <p>
              This evaluation build saves records in this browser. Volunteer
              entry selects an existing active demo profile; it is not
              production authentication. Server accounts, notifications, and
              verification will require a backend.
            </p>
          </details>
        </div>
        <footer>
          <Icon name="heart" size={15} />
          <span>A useful record makes the next good day easier.</span>
        </footer>
      </dialog>
    </div>
  );
}

type ProfileForm = {
  photo: string;
  name: string;
  email: string;
  phone: string;
  skills: string;
  availability: Volunteer["availability"];
};
const asForm = (v: Volunteer): ProfileForm => ({
  photo: v.photo ?? "",
  name: v.name,
  email: v.email,
  phone: v.phone,
  skills: v.skills.join(", "),
  availability: v.availability,
});
const skillIdeas = [
  "Teaching",
  "First aid",
  "Logistics",
  "Community outreach",
  "Photography",
  "Data entry",
];

function VolunteerProfile({ volunteerId }: { volunteerId: string }) {
  const { db, update } = useWorkspace();
  const volunteer = db.volunteers.find((v) => v.id === volunteerId)!;
  const [form, setForm] = useState<ProfileForm>(() => asForm(volunteer));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const errorSummary = useRef<HTMLDivElement>(null);
  const baseline = asForm(volunteer);
  const changed = (Object.keys(form) as (keyof ProfileForm)[]).some(
    (key) => form[key] !== baseline[key],
  );
  const skills = form.skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  function setField<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K],
  ) {
    setForm({ ...form, [key]: value });
    setNotice("");
    setErrors({ ...errors, [key]: "" });
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (photoBusy) return;
    const nextErrors: Record<string, string> = {};
    if (form.name.trim().length < 2)
      nextErrors.name =
        "Enter at least two characters for the name your coordinator should use.";
    if (form.name.trim().length > 200)
      nextErrors.name = "Use no more than 200 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      nextErrors.email = "Enter a valid email address for your profile.";
    if (
      db.volunteers.some(
        (v) =>
          v.id !== volunteerId &&
          v.email &&
          v.email.toLowerCase() === form.email.trim().toLowerCase(),
      )
    )
      nextErrors.email =
        "Another volunteer profile already uses this email address.";
    if (form.phone.trim() && !/^[+()\d\s.-]{7,60}$/.test(form.phone.trim()))
      nextErrors.phone =
        "Use a phone number with digits and an optional country code.";
    if (
      form.phone.trim() &&
      (form.phone.replace(/\D/g, "").length < 7 ||
        form.phone.replace(/\D/g, "").length > 15)
    )
      nextErrors.phone = "Include 7–15 digits, with an optional country code.";
    if (skills.length > 30 || skills.some((s) => s.length > 100))
      nextErrors.skills =
        "Add up to 30 skills, with no more than 100 characters each.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => errorSummary.current?.focus());
      return;
    }
    const uniqueSkills = [
      ...new Map(skills.map((s) => [s.toLowerCase(), s])).values(),
    ];
    const ok = update(
      (data) => {
        const current = data.volunteers.find((v) => v.id === volunteerId);
        if (!current || current.status !== "Active")
          throw new Error("This volunteer profile is no longer active.");
        if (
          data.volunteers.some(
            (v) =>
              v.id !== volunteerId &&
              v.email &&
              v.email.toLowerCase() === form.email.trim().toLowerCase(),
          )
        )
          throw new Error("Another volunteer already uses this email address.");
        data.volunteers = data.volunteers.map((v) =>
          v.id === volunteerId
            ? {
                ...v,
                photo: form.photo || undefined,
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                skills: uniqueSkills,
                availability: form.availability,
              }
            : v,
        );
        return data;
      },
      {
        title: "Volunteer updated their profile",
        detail: `${form.name.trim()} · contact details, skills and availability`,
        kind: "volunteer",
      },
    );
    if (ok) {
      setForm({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        skills: uniqueSkills.join(", "),
      });
      setNotice(
        "Your details are saved. Your coordinator’s directory now uses this information.",
      );
    } else
      setNotice(
        "Your changes could not be applied. Check the workspace notice above and try again.",
      );
  }
  return (
    <div className="vp-profile-page">
      <div className="vp-page-caption">
        <span>CHAPTER 04</span>
        <span>THE PERSON BEHIND THE HOURS</span>
      </div>
      <div className="vp-profile-intro">
        <h1>
          Make room
          <br />
          for <em>what you bring.</em>
        </h1>
        <p>
          Good coordination begins with the right details. Keep your contact
          information current and let the team know how you can help.
        </p>
      </div>
      <div className="vp-profile-layout">
        <aside className="vp-passport">
          <span className="vp-passport-punch" />
          <span className="vp-passport-label">VOLUNTEER / MEMBER RECORD</span>
          <div className="vp-passport-initials">
            <ProfileAvatar className="vp-passport-portrait" name={volunteer.name} photo={volunteer.photo} />
            <FieldMark />
          </div>
          <h2>{volunteer.name}</h2>
          <p>
            {volunteer.availability}
            <span>Available to help</span>
          </p>
          <dl>
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(volunteer.joinedOn)}</dd>
            </div>
            <div>
              <dt>Profile reference</dt>
              <dd>{volunteer.id.toUpperCase()}</dd>
            </div>
            <div>
              <dt>Directory status</dt>
              <dd>
                <i />
                {volunteer.status}
              </dd>
            </div>
          </dl>
          <span className="vp-passport-stamp">
            HERE TO
            <br />
            <em>help.</em>
          </span>
          <small>
            Your identity stays attached to your service record, even when your
            contact details change.
          </small>
        </aside>
        <form className="vp-profile-form" onSubmit={save} noValidate>
          <section>
            <div className="vp-form-section-title">
              <span>01</span>
              <div>
                <h2>The basics</h2>
                <p>Contact details your coordinator can use.</p>
              </div>
            </div>
            {Object.values(errors).some(Boolean) && (
              <div
                className="vp-form-error"
                role="alert"
                ref={errorSummary}
                tabIndex={-1}
              >
                A few details need attention. Review the highlighted fields
                below.
              </div>
            )}
            <div className="vp-profile-fields">
              <ProfilePhotoPicker name={form.name} value={form.photo} onChange={photo => setField("photo", photo)} onBusyChange={setPhotoBusy} />
              <label htmlFor="vp-profile-name">
                Full name
                <input
                  id="vp-profile-name"
                  aria-label="Full name"
                  autoComplete="name"
                  maxLength={200}
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "vp-name-error" : undefined}
                />
                {errors.name && <small id="vp-name-error">{errors.name}</small>}
              </label>
              <label htmlFor="vp-profile-email">
                Email address
                <input
                  id="vp-profile-email"
                  aria-label="Email address"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "vp-email-error" : undefined}
                />
                {errors.email && (
                  <small id="vp-email-error">{errors.email}</small>
                )}
              </label>
              <label htmlFor="vp-profile-phone">
                Phone number <span>(optional)</span>
                <input
                  id="vp-profile-phone"
                  aria-label="Phone number"
                  type="tel"
                  autoComplete="tel"
                  maxLength={60}
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "vp-phone-error" : undefined}
                />
                {errors.phone && (
                  <small id="vp-phone-error">{errors.phone}</small>
                )}
              </label>
            </div>
          </section>
          <section>
            <div className="vp-form-section-title">
              <span>02</span>
              <div>
                <h2>What you can offer</h2>
                <p>
                  A skill doesn’t need to be a qualification. Practical
                  experience counts.
                </p>
              </div>
            </div>
            <label className="vp-skill-input" htmlFor="vp-profile-skills">
              Skills, separated by commas
              <textarea
                id="vp-profile-skills"
                aria-label="Skills, separated by commas"
                rows={3}
                maxLength={3050}
                value={form.skills}
                onChange={(e) => setField("skills", e.target.value)}
                aria-invalid={!!errors.skills}
                aria-describedby={
                  errors.skills ? "vp-skills-error" : "vp-skills-hint"
                }
              />
            </label>
            {errors.skills ? (
              <small className="vp-field-error" id="vp-skills-error">
                {errors.skills}
              </small>
            ) : (
              <p className="vp-field-hint" id="vp-skills-hint">
                Up to 30 skills. Add a suggestion below or write your own.
              </p>
            )}
            <div className="vp-skill-suggestions">
              {skillIdeas.map((skill) => (
                <button
                  type="button"
                  key={skill}
                  aria-pressed={skills.some(
                    (s) => s.toLowerCase() === skill.toLowerCase(),
                  )}
                  onClick={() => {
                    const has = skills.some(
                      (s) => s.toLowerCase() === skill.toLowerCase(),
                    );
                    setField(
                      "skills",
                      has
                        ? skills
                            .filter(
                              (s) => s.toLowerCase() !== skill.toLowerCase(),
                            )
                            .join(", ")
                        : [...skills, skill].join(", "),
                    );
                  }}
                >
                  <span>
                    {skills.some((s) => s.toLowerCase() === skill.toLowerCase())
                      ? "−"
                      : "+"}
                  </span>
                  {skill}
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="vp-form-section-title">
              <span>03</span>
              <div>
                <h2>When life leaves a little space</h2>
                <p>
                  Availability helps the team coordinate. It doesn’t
                  automatically register you for a drive.
                </p>
              </div>
            </div>
            <fieldset className="vp-availability">
              <legend className="vp-sr">My availability</legend>
              {(
                [
                  { value: "Weekdays", copy: "During the working week" },
                  { value: "Weekends", copy: "A little weekend time" },
                  { value: "Flexible", copy: "Let’s find a time that fits" },
                ] as const
              ).map((item) => (
                <label key={item.value}>
                  <input
                    type="radio"
                    name="volunteer-availability"
                    value={item.value}
                    checked={form.availability === item.value}
                    onChange={() => setField("availability", item.value)}
                  />
                  <span>
                    <strong>{item.value}</strong>
                    <small>{item.copy}</small>
                  </span>
                  <i />
                </label>
              ))}
            </fieldset>
          </section>
          <div className="vp-profile-save">
            <span>
              <Icon name="shield" size={16} />
              Your existing service history stays intact.
            </span>
            <div>
              <button
                type="button"
                className="vp-discard"
                disabled={!changed || photoBusy}
                onClick={() => {
                  setForm(asForm(volunteer));
                  setErrors({});
                  setNotice("");
                }}
              >
                Discard changes
              </button>
              <button
                className="vp-solid-button"
                type="submit"
                disabled={!changed || photoBusy}
              >
                Save my details
                <Icon name="arrow" size={16} />
              </button>
            </div>
          </div>
          {notice && (
            <div className="vp-profile-notice" role="status">
              <Icon
                name={
                  notice.startsWith("Your details are saved")
                    ? "check"
                    : "shield"
                }
                size={17}
              />
              {notice}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
