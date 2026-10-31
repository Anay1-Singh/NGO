import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "./ServeBaseIcons";
import { ThemeToggle } from "./ServeBaseTheme";
import type { Theme } from "./ServeBaseTheme";
import "./ServeBaseAuth.css";

type Props = {
  theme: Theme;
  toggleTheme: () => void;
  recovery: boolean;
  onDemoLogin: () => void;
};
export function AdminAuthPage({
  theme,
  toggleTheme,
  recovery,
  onDemoLogin,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [notice, setNotice] = useState("");
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = recovery
      ? "Recover admin access — ServeBase"
      : "Admin sign in — ServeBase";
    title.current?.focus({ preventScroll: true });
  }, [recovery]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (!recovery) {
      onDemoLogin();
      return;
    }
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Enter your work email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Enter a valid email address.";
    if (!recovery && !password) next.password = "Enter your password.";
    setErrors(next);
    if (next.email) {
      emailInput.current?.focus();
      return;
    }
    if (next.password) {
      passwordInput.current?.focus();
      return;
    }
    setNotice(
      recovery
        ? "Password recovery is not connected yet. No reset email has been sent."
        : "The sign-in service is not connected yet. Your credentials have not been sent or saved.",
    );
  }
  return (
    <div className="sb sb-auth">
      <a
        href="#auth-main"
        className="sb-skip"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("auth-main")?.focus();
        }}
      >
        Skip to sign-in form
      </a>
      <header className="sb-auth-header">
        <a href="#home" className="sb-brand" aria-label="ServeBase home">
          <span className="sb-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          ServeBase<span className="sb-brand-period">.</span>
          <span className="sb-auth-brand-label">THE OPERATIONS DESK</span>
        </a>
        <div>
          <a className="sb-auth-home" href="#home">
            <span>←</span>Back to website
          </a>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>
      <main className="sb-auth-layout" id="auth-main" tabIndex={-1}>
        <section
          className="sb-auth-story"
          aria-labelledby="sb-auth-story-title"
        >
          <div className="sb-auth-story-inner">
            <div className="sb-auth-kicker">
              <span />A PLACE TO GET THINGS DONE
            </div>
            <h2 id="sb-auth-story-title">
              Before the first
              <br />
              drive begins.
              <br />
              <em>Have a clear plan.</em>
            </h2>
            <p>
              Set the roster. Check the contributions. Leave a record someone
              else can pick up tomorrow.
            </p>
            <div className="sb-auth-flow" aria-hidden="true">
              <div>
                <span className="sb-auth-flow-icon">
                  <Icon name="users" size={20} />
                </span>
                <span>
                  <strong>Who is coming?</strong>
                  <small>Names, skills, and availability.</small>
                </span>
                <span className="sb-auth-flow-index">01</span>
              </div>
              <i />
              <div>
                <span className="sb-auth-flow-icon">
                  <Icon name="heart" size={20} />
                </span>
                <span>
                  <strong>What can we use?</strong>
                  <small>Funding, supplies, and donor history.</small>
                </span>
                <span className="sb-auth-flow-index">02</span>
              </div>
              <i />
              <div>
                <span className="sb-auth-flow-icon">
                  <Icon name="globe" size={20} />
                </span>
                <span>
                  <strong>What happened next?</strong>
                  <small>Attendance, hours, and a record to keep.</small>
                </span>
                <span className="sb-auth-flow-index">03</span>
              </div>
            </div>
            <div className="sb-auth-story-credit">
              <span className="sb-auth-credit-rule" />
              <span>
                K.R. Mangalam University
                <br />
                <b>Community Service Project · 2026</b>
              </span>
            </div>
          </div>
          <span className="sb-auth-corner" aria-hidden="true">
            SERVEBASE / FIELD NOTES NO. 001
          </span>
        </section>
        <section className="sb-auth-form-panel" aria-labelledby="sb-auth-title">
          <div className="sb-auth-form-wrap">
            <div className="sb-auth-access">
              <Icon name="shield" size={17} />
              {recovery ? "ACCESS ASSISTANCE" : "WORKSPACE ENTRY / 01"}
            </div>
            <h1 id="sb-auth-title" ref={title} tabIndex={-1}>
              {recovery
                ? "Find your way back."
                : "Take your place at the desk."}
            </h1>
            <p className="sb-auth-intro">
              {recovery
                ? "The recovery form is ready for a future sign-in service. Enter an email to see its validation."
                : "The evaluation workspace is ready. Enter directly to work with volunteers, contributions, and upcoming drives."}
            </p>
            <form
              className="sb-auth-form"
              onSubmit={submit}
              noValidate
              aria-describedby="sb-auth-preview-note"
            >
              <div className="sb-auth-field">
                <label htmlFor="sb-auth-email">Work email</label>
                <div
                  className={`sb-auth-input${errors.email ? " has-error" : ""}`}
                >
                  <Icon name="mail" size={18} />
                  <input
                    id="sb-auth-email"
                    ref={emailInput}
                    name="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    spellCheck={false}
                    autoCapitalize="none"
                    placeholder="you@organization.org"
                    maxLength={254}
                    required={recovery}
                    value={email}
                    aria-invalid={!!errors.email}
                    aria-describedby={
                      errors.email ? "sb-auth-email-error" : undefined
                    }
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErrors((current) => ({
                        ...current,
                        email: undefined,
                      }));
                      setNotice("");
                    }}
                  />
                </div>
                {errors.email && (
                  <p id="sb-auth-email-error" className="sb-auth-field-error">
                    {errors.email}
                  </p>
                )}
              </div>
              {!recovery && (
                <div className="sb-auth-field">
                  <div className="sb-auth-label-row">
                    <label htmlFor="sb-auth-password">Password</label>
                    <a href="#/admin/reset-password">Forgot password?</a>
                  </div>
                  <div
                    className={`sb-auth-input${errors.password ? " has-error" : ""}`}
                  >
                    <Icon name="lock" size={18} />
                    <input
                      id="sb-auth-password"
                      ref={passwordInput}
                      name="password"
                      type={visible ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      required={recovery}
                      value={password}
                      aria-invalid={!!errors.password}
                      aria-describedby={
                        [
                          errors.password ? "sb-auth-password-error" : "",
                          capsLock ? "sb-auth-caps" : "",
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                      onKeyUp={(event) =>
                        setCapsLock(event.getModifierState("CapsLock"))
                      }
                      onKeyDown={(event) =>
                        setCapsLock(event.getModifierState("CapsLock"))
                      }
                      onBlur={() => setCapsLock(false)}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setErrors((current) => ({
                          ...current,
                          password: undefined,
                        }));
                        setNotice("");
                      }}
                    />
                    <button
                      type="button"
                      className="sb-auth-password-toggle"
                      aria-label={visible ? "Hide password" : "Show password"}
                      aria-pressed={visible}
                      onClick={() => setVisible(!visible)}
                    >
                      <Icon name={visible ? "eyeOff" : "eye"} size={18} />
                    </button>
                  </div>
                  {errors.password && (
                    <p
                      id="sb-auth-password-error"
                      className="sb-auth-field-error"
                    >
                      {errors.password}
                    </p>
                  )}
                  {capsLock && (
                    <p id="sb-auth-caps" className="sb-auth-caps">
                      Caps Lock is on.
                    </p>
                  )}
                </div>
              )}
              {!recovery && (
                <p className="sb-auth-demo-hint">
                  You can leave both fields empty and continue.
                </p>
              )}
              <button className="sb-auth-submit" type="submit">
                {recovery ? "Request reset link" : "Sign in to ServeBase"}
                <Icon name="arrow" size={18} />
              </button>
              {notice && (
                <div className="sb-auth-notice" role="status">
                  <Icon name="lock" size={17} />
                  <p>{notice}</p>
                </div>
              )}
            </form>
            {recovery ? (
              <a href="#/admin/login" className="sb-auth-return">
                ← Back to sign in
              </a>
            ) : (
              <div className="sb-auth-restricted">
                <Icon name="lock" size={13} />
                <span>Open evaluation access · no account needed.</span>
              </div>
            )}
            <div className="sb-auth-preview-note" id="sb-auth-preview-note">
              <span />
              Local demo<span className="sb-auth-preview-divider">/</span>
              Credentials stay unused
            </div>
            {!recovery && (
              <a className="sb-volunteer-entry" href="#/volunteer/login">
                <span>Here to volunteer?</span>Open your fieldbook
                <Icon name="arrow" size={15} />
              </a>
            )}
            <p className="sb-auth-help">
              {recovery
                ? "Reset emails are not enabled in this prototype."
                : "Working on a shared computer?"}
              <br />
              {recovery
                ? "Return to sign in to enter the demo."
                : "Exit the demo when you finish your session."}
            </p>
          </div>
        </section>
      </main>
      <footer className="sb-auth-footer">
        <span>ServeBase · NGO Management Infrastructure</span>
        <a href="#/terms">Terms & Conditions</a>
        <span>
          Destination Success <b>·</b> Academic Software Prototype
        </span>
      </footer>
    </div>
  );
}
