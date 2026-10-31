import { useRef, useState, type FormEvent } from "react";
import { Icon } from "./ServeBaseIcons";
import { ProfilePhotoPicker } from "./ServeBaseProfilePhoto";
import { newId, useWorkspace, type Volunteer } from "./ServeBaseStore";
import { VolunteerThemeToggle, type VolunteerTheme } from "./ServeBaseVolunteerTheme";
import "./ServeBaseVolunteerAuth.css";
import "./ServeBaseVolunteerSignup.css";

const termsVersion = "2026-10-26";
const skillSuggestions = ["Teaching", "First aid", "Logistics", "Community outreach", "Photography", "Data entry"];
const availabilityOptions: { value: Volunteer["availability"]; detail: string }[] = [
  { value: "Weekdays", detail: "Monday to Friday" },
  { value: "Weekends", detail: "Saturday & Sunday" },
  { value: "Flexible", detail: "Decide with the team" },
];

type SignupForm = {
  name: string;
  email: string;
  phone: string;
  skills: string;
  availability: Volunteer["availability"];
};

export function VolunteerSignupPage({
  onCreated,
  theme,
  toggleTheme,
}: {
  onCreated: (volunteerId: string) => void;
  theme: VolunteerTheme;
  toggleTheme: () => void;
}) {
  const { db, update } = useWorkspace();
  const [form, setForm] = useState<SignupForm>({ name: "", email: "", phone: "", skills: "", availability: "Flexible" });
  const [photo, setPhoto] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitLock = useRef(false);
  const skills = form.skills.split(",").map((skill) => skill.trim()).filter(Boolean);

  function setField<K extends keyof SignupForm>(key: K, value: SignupForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setNotice("");
  }

  function toggleSkill(skill: string) {
    const included = skills.some((item) => item.toLowerCase() === skill.toLowerCase());
    setField("skills", included
      ? skills.filter((item) => item.toLowerCase() !== skill.toLowerCase()).join(", ")
      : [...skills, skill].join(", "));
  }

  function focusFirstError() {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || photoBusy) return;
    const nextErrors: Record<string, string> = {};
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (name.length < 2 || name.length > 200)
      nextErrors.name = "Enter your name using 2–200 characters.";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.email = "Enter a valid email address for your volunteer profile.";
    else if (db.volunteers.some((volunteer) => volunteer.email.trim().toLowerCase() === email.toLowerCase()))
      nextErrors.email = "A volunteer profile already uses this email. Sign in with that profile or use another address.";
    if (phone && (!/^[+()\d\s.-]{7,60}$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15))
      nextErrors.phone = "Include 7–15 digits, with an optional country code.";
    if (skills.length > 30 || skills.some((skill) => skill.length > 100))
      nextErrors.skills = "Add up to 30 skills, with no more than 100 characters each.";
    if (!availabilityOptions.some((option) => option.value === form.availability))
      nextErrors.availability = "Choose when you are usually available.";
    if (!accepted)
      nextErrors.terms = "Read and accept the terms & conditions to create your account.";
    setErrors(nextErrors);
    setNotice("");
    if (Object.keys(nextErrors).length) {
      focusFirstError();
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    const volunteerId = newId("vol");
    const uniqueSkills = [...new Map(skills.map((skill) => [skill.toLowerCase(), skill])).values()];
    const joinedOn = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    let failure = "Your account could not be created. Please try again.";
    const ok = update((current) => {
      if (current.volunteers.some((volunteer) => volunteer.email.trim().toLowerCase() === email.toLowerCase())) {
        failure = "A volunteer profile already uses this email. Return to sign-in or use another address.";
        throw new Error(failure);
      }
      if (current.volunteers.length >= 5000) {
        failure = "This local workspace has reached its 5,000-profile limit. Ask the workspace administrator for help.";
        throw new Error(failure);
      }
      const volunteer: Volunteer = {
        id: volunteerId,
        name,
        email,
        phone,
        skills: uniqueSkills,
        availability: form.availability,
        status: "Active",
        joinedOn,
        notes: "",
        ...(photo ? { photo } : {}),
        termsAcceptedAt: new Date().toISOString(),
        termsVersion,
      };
      return { ...current, volunteers: [...current.volunteers, volunteer] };
    }, {
      title: "Volunteer account created",
      detail: `${name} joined the local volunteer fieldbook.`,
      kind: "volunteer",
    });
    if (ok) {
      onCreated(volunteerId);
      return;
    }
    submitLock.current = false;
    setSubmitting(false);
    setNotice(failure);
    if (failure.startsWith("A volunteer")) {
      setErrors({ email: failure });
      focusFirstError();
    }
  }

  return (
    <main className="sv-auth sv-signup" aria-labelledby="sv-signup-title">
      <header className="sv-auth-header">
        <a className="sv-auth-brand" href="#/" aria-label="ServeBase home">
          <svg className="sv-auth-brand-mark" width="31" height="35" viewBox="0 0 31 35" fill="none" aria-hidden="true">
            <path d="M15.5 29V13m0 10C5.5 23 4 17 4 10c8.5 0 11.5 4.5 11.5 13Zm0-5C25.5 18 27 12 27 5c-8.5 0-11.5 4.5-11.5 13ZM8 30c4.5-2 10.5-2 15 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>ServeBase<small>THE VOLUNTEER FIELDBOOK</small></span>
        </a>
        <div className="sv-auth-header-actions">
          <VolunteerThemeToggle theme={theme} onToggle={toggleTheme} />
          <a className="sv-signup-login" href="#/volunteer/login">Already a member? <strong>Sign in</strong><Icon name="arrow" size={16} /></a>
        </div>
      </header>

      <div className="sv-signup-layout">
        <aside className="sv-signup-intro">
          <span className="sv-signup-eyebrow">A NEW PAGE / YOUR COMMUNITY</span>
          <h1 id="sv-signup-title">Bring your time.<br /><em>Find your people.</em></h1>
          <p>Start a volunteer fieldbook with the details your coordinator needs to help you take part.</p>
          <ol className="sv-signup-explainer">
            <li><span>01</span><div><strong>Make it yours</strong><p>Add a name and an optional picture so your team can recognise you.</p></div></li>
            <li><span>02</span><div><strong>Share what fits</strong><p>Tell us what you enjoy doing and when you are generally available.</p></div></li>
            <li><span>03</span><div><strong>Choose your first drive</strong><p>Your fieldbook opens straight away. Browse opportunities at your own pace.</p></div></li>
          </ol>
          <div className="sv-signup-local-note">
            <Icon name="database" size={20} />
            <div><strong>A browser-local account</strong><p>This academic preview saves profiles on this device. There is no password or identity verification; anyone using this workspace can open a demo profile.</p></div>
          </div>
        </aside>

        <form ref={formRef} className="sv-signup-form" onSubmit={submit} noValidate aria-label="Create a volunteer account" aria-busy={submitting || photoBusy}>
          <div className="sv-signup-form-heading"><div><span>YOUR MEMBER RECORD</span><h2>Create your fieldbook</h2></div><span className="sv-signup-required">* Required</span></div>
          <fieldset className="sv-signup-section" disabled={submitting}>
            <legend><span>01</span> Your profile</legend>
            <ProfilePhotoPicker value={photo} onChange={setPhoto} onBusyChange={setPhotoBusy} name={form.name || "New volunteer"} disabled={submitting} />
            <div className="sv-signup-fields">
              <label className="sv-signup-field" htmlFor="sv-signup-name">Full name <span aria-hidden="true">*</span>
                <input id="sv-signup-name" name="name" autoComplete="name" required maxLength={200} value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="The name your team should use" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "sv-signup-name-error" : undefined} />
                {errors.name && <small id="sv-signup-name-error" className="sv-signup-field-error">{errors.name}</small>}
              </label>
              <label className="sv-signup-field" htmlFor="sv-signup-email">Email address <span aria-hidden="true">*</span>
                <input id="sv-signup-email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="you@example.org" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "sv-signup-email-error" : "sv-signup-email-hint"} />
                {errors.email ? <small id="sv-signup-email-error" className="sv-signup-field-error">{errors.email}</small> : <small id="sv-signup-email-hint">Use this email to find your profile on your next visit.</small>}
              </label>
              <label className="sv-signup-field" htmlFor="sv-signup-phone">Phone number <span className="sv-signup-optional">Optional</span>
                <input id="sv-signup-phone" name="tel" type="tel" autoComplete="tel" maxLength={60} value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="+91 98765 43210" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "sv-signup-phone-error" : undefined} />
                {errors.phone && <small id="sv-signup-phone-error" className="sv-signup-field-error">{errors.phone}</small>}
              </label>
            </div>
          </fieldset>

          <fieldset className="sv-signup-section" disabled={submitting}>
            <legend><span>02</span> Where you can help</legend>
            <label className="sv-signup-field" htmlFor="sv-signup-skills">Skills &amp; interests <span className="sv-signup-optional">Optional</span>
              <input id="sv-signup-skills" name="skills" maxLength={3029} value={form.skills} onChange={(event) => setField("skills", event.target.value)} placeholder="e.g. Teaching, community outreach" aria-invalid={Boolean(errors.skills)} aria-describedby={errors.skills ? "sv-signup-skills-error" : "sv-signup-skills-hint"} />
              {errors.skills ? <small id="sv-signup-skills-error" className="sv-signup-field-error">{errors.skills}</small> : <small id="sv-signup-skills-hint">Separate each skill with a comma, or choose a suggestion below.</small>}
            </label>
            <div className="sv-signup-skills" aria-label="Suggested skills">{skillSuggestions.map((skill) => <button type="button" key={skill} aria-pressed={skills.some((item) => item.toLowerCase() === skill.toLowerCase())} onClick={() => toggleSkill(skill)}>{skill}<Icon name={skills.some((item) => item.toLowerCase() === skill.toLowerCase()) ? "check" : "arrow"} size={12} /></button>)}</div>
            <fieldset className="sv-signup-availability"><legend>Usual availability <span aria-hidden="true">*</span></legend><div>{availabilityOptions.map((option) => <label key={option.value}><input type="radio" name="availability" value={option.value} checked={form.availability === option.value} onChange={() => setField("availability", option.value)} aria-invalid={Boolean(errors.availability)} aria-describedby={errors.availability ? "sv-signup-availability-error" : undefined} /><span><strong>{option.value}</strong><small>{option.detail}</small></span></label>)}</div>{errors.availability && <small id="sv-signup-availability-error" className="sv-signup-field-error">{errors.availability}</small>}<p>You can update this later. A specific drive still needs your registration.</p></fieldset>
          </fieldset>

          <div className="sv-signup-agreement">
            <label htmlFor="sv-signup-terms"><input id="sv-signup-terms" type="checkbox" checked={accepted} required disabled={submitting} onChange={(event) => { setAccepted(event.target.checked); setErrors((current) => ({ ...current, terms: "" })); }} aria-invalid={Boolean(errors.terms)} aria-describedby={errors.terms ? "sv-signup-terms-error" : "sv-signup-terms-hint"} /><span>I have read and agree to the <a href="#/terms" target="_blank" rel="noopener noreferrer">terms &amp; conditions<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3H3v10h10v-3M8 2h6v6M14 2 7 9" stroke="currentColor" strokeWidth="1.4" /></svg><span className="sv-signup-sr"> (opens in a new tab)</span></a>.</span></label>
            <p id="sv-signup-terms-hint">Your details and optional photo are visible to workspace administrators and included in local backups. Use sample information in this demo.</p>
            {errors.terms && <p id="sv-signup-terms-error" className="sv-signup-field-error" role="alert">{errors.terms}</p>}
          </div>
          {notice && <p className="sv-signup-notice" role="alert">{notice}</p>}
          <button className="sv-auth-open" type="submit" disabled={submitting || photoBusy}><span>{submitting ? "Creating your fieldbook…" : photoBusy ? "Preparing your picture…" : "Create my volunteer account"}</span><span className="sv-auth-open-arrow"><Icon name="arrow" size={21} /></span></button>
          <p className="sv-signup-submit-note">Creates an active local profile and opens your volunteer dashboard.</p>
        </form>
      </div>

      <footer className="sv-auth-footer"><p>A small beginning. A shared purpose.</p><a href="#/volunteer/login">Return to volunteer sign-in<Icon name="arrow" size={15} /></a></footer>
    </main>
  );
}
