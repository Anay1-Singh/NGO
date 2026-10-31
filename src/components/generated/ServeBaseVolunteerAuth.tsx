import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "./ServeBaseIcons";
import { useWorkspace } from "./ServeBaseStore";
import { VolunteerThemeToggle } from "./ServeBaseVolunteerTheme";
import { ProfileAvatar } from "./ServeBaseProfilePhoto";
import type { VolunteerTheme } from "./ServeBaseVolunteerTheme";
import "./ServeBaseVolunteerAuth.css";

export function VolunteerAuthPage({
  onLogin,
  theme,
  toggleTheme,
}: {
  onLogin: (volunteerId: string) => void;
  theme: VolunteerTheme;
  toggleTheme: () => void;
}) {
  const { db } = useWorkspace();
  const profiles = useMemo(
    () => db.volunteers.filter((volunteer) => volunteer.status === "Active"),
    [db.volunteers],
  );
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? "");
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const selectedProfile =
    profiles.find((profile) => profile.id === selectedId) ?? profiles[0];
  const emailMatches = profiles.filter(
    (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
  );
  const profile = emailMode
    ? emailMatches.length === 1
      ? emailMatches[0]
      : undefined
    : selectedProfile;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      setError(
        emailMode
          ? emailMatches.length > 1
            ? "More than one active profile uses this email. Choose your demo profile from the list instead."
            : "That email does not match an active profile in this local workspace. Choose a demo profile instead."
          : "There are no active volunteer profiles in this workspace. An administrator can add or activate one.",
      );
      return;
    }
    setError("");
    onLogin(profile.id);
  }

  function changeEntryMethod() {
    setEmailMode((value) => !value);
    setEmail(selectedProfile?.email ?? "");
    setError("");
  }

  return (
    <main className="sv-auth" aria-labelledby="sv-auth-title">
      <header className="sv-auth-header">
        <a className="sv-auth-brand" href="#/" aria-label="ServeBase home">
          <svg
            className="sv-auth-brand-mark"
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
          <span>
            ServeBase<small>THE VOLUNTEER FIELDBOOK</small>
          </span>
        </a>
        <div className="sv-auth-header-actions">
          <VolunteerThemeToggle theme={theme} onToggle={toggleTheme} />
          <a className="sv-auth-return" href="#/">
            Back to the community <Icon name="arrow" size={17} />
          </a>
        </div>
      </header>

      <div className="sv-auth-layout">
        <section
          className="sv-auth-story"
          aria-labelledby="sv-auth-story-title"
        >
          <div className="sv-auth-story-kicker">
            <span className="sv-auth-sun" aria-hidden="true" />
            <span>SMALL COMMITMENTS. SHARED PROGRESS.</span>
          </div>
          <h2 id="sv-auth-story-title">
            Good things
            <br />
            begin with
            <br />
            <em>showing up.</em>
          </h2>
          <p className="sv-auth-story-copy">
            A place for your time, your skills, and the people you choose to
            stand beside.
          </p>

          <div className="sv-auth-route" aria-hidden="true">
            <svg viewBox="0 0 500 164" fill="none">
              <path d="M30 120C70 120 70 42 144 42s64 93 145 93S355 38 463 38" />
              <circle cx="30" cy="120" r="8" />
              <circle cx="144" cy="42" r="8" />
              <circle cx="289" cy="135" r="8" />
              <circle cx="463" cy="38" r="8" />
            </svg>
            <span className="sv-auth-route-first">FIND YOUR PLACE</span>
            <span className="sv-auth-route-last">MAKE YOUR MARK</span>
          </div>

          <div className="sv-auth-story-bottom">
            <span className="sv-auth-edition">
              VOL. 01
              <br />
              <strong>People before paperwork.</strong>
            </span>
            <span className="sv-auth-stamp" aria-hidden="true">
              <Icon name="heart" size={25} />
              <span>
                MADE FOR
                <br />
                COMMUNITY
              </span>
            </span>
          </div>
        </section>

        <section className="sv-auth-entry" aria-labelledby="sv-auth-title">
          <div className="sv-auth-entry-heading">
            <span>YOUR PERSONAL FIELDBOOK</span>
            <span>01 / ENTRY</span>
          </div>
          <h1 id="sv-auth-title">
            There’s a place
            <br />
            for you here.
          </h1>
          <p className="sv-auth-intro">
            Find a drive that fits. Keep your plans together. Follow the
            difference your time makes.
          </p>

          <form className="sv-auth-form" onSubmit={submit} noValidate>
            <div className="sv-auth-label-row">
              <label htmlFor={emailMode ? "sv-auth-email" : "sv-auth-profile"}>
                {emailMode ? "Profile email" : "Choose a volunteer profile"}
              </label>
              <button
                type="button"
                className="sv-auth-method"
                onClick={changeEntryMethod}
              >
                {emailMode ? "Choose from the list" : "Find by email"}
                <Icon name="arrow" size={14} />
              </button>
            </div>
            {emailMode ? (
              <div className="sv-auth-email-wrap">
                <Icon name="mail" size={19} />
                <input
                  id="sv-auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  placeholder="name@example.org"
                  aria-describedby="sv-auth-demo-note"
                  aria-invalid={Boolean(error)}
                />
              </div>
            ) : (
              <div className="sv-auth-select-wrap">
                <select
                  id="sv-auth-profile"
                  value={selectedProfile?.id ?? ""}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setError("");
                  }}
                  disabled={!profiles.length}
                  aria-describedby="sv-auth-demo-note"
                >
                  {profiles.length ? (
                    profiles.map((volunteer) => (
                      <option key={volunteer.id} value={volunteer.id}>
                        {volunteer.name} · {volunteer.availability}
                      </option>
                    ))
                  ) : (
                    <option value="">No active profiles available</option>
                  )}
                </select>
                <Icon name="chevron" size={17} />
              </div>
            )}

            {profile ? (
              <div className="sv-auth-profile-card">
                <ProfileAvatar
                  className="sv-auth-initials"
                  photo={profile.photo}
                  name={profile.name}
                />
                <div>
                  <strong>{profile.name}</strong>
                  <span>
                    {profile.availability} ·{" "}
                    {profile.skills[0] || "Community volunteer"}
                  </span>
                </div>
                <span
                  className="sv-auth-profile-check"
                  aria-label="Active profile"
                >
                  <Icon name="check" size={17} />
                </span>
              </div>
            ) : (
              <p className="sv-auth-profile-hint">
                {profiles.length
                  ? "Use the email attached to an active volunteer profile, or choose a name from the list."
                  : "Ask your workspace administrator to create or activate a volunteer profile before opening a fieldbook."}
              </p>
            )}

            {error && (
              <p className="sv-auth-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="sv-auth-open"
              disabled={!profiles.length}
            >
              <span>Open my fieldbook</span>
              <span className="sv-auth-open-arrow">
                <Icon name="arrow" size={22} />
              </span>
            </button>
            <p id="sv-auth-demo-note" className="sv-auth-demo-note">
              <span>LOCAL DEMO</span>This preview opens the selected profile
              stored in this browser. No password or identity verification is
              used.
            </p>
            <div className="sv-auth-create">
              <span>New to the fieldbook?</span>
              <a href="#/volunteer/register">
                Create a volunteer account <Icon name="arrow" size={15} />
              </a>
            </div>
          </form>

          <div className="sv-auth-inside">
            <h3>A little more clarity, every day.</h3>
            <ol>
              <li>
                <span>01</span>
                <p>
                  Discover opportunities
                  <strong>Browse community drives and reserve a place.</strong>
                </p>
              </li>
              <li>
                <span>02</span>
                <p>
                  Show up prepared
                  <strong>
                    Check your role, location, and upcoming plans.
                  </strong>
                </p>
              </li>
              <li>
                <span>03</span>
                <p>
                  See your contribution
                  <strong>
                    Review attendance and hours recorded by your team.
                  </strong>
                </p>
              </li>
            </ol>
          </div>
        </section>
      </div>

      <footer className="sv-auth-footer">
        <div className="sv-auth-footer-note">
          <p>Time well given. Communities well supported.</p>
          <a href="#/terms">Terms &amp; conditions</a>
        </div>
        <a href="#/admin/login">
          Managing the workspace? <span>Administrator entry</span>
          <Icon name="arrow" size={15} />
        </a>
      </footer>
    </main>
  );
}
