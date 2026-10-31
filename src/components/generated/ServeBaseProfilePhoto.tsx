import { useEffect, useId, useRef, useState } from "react";
import { isProfilePhoto, prepareProfilePhoto } from "./ServeBaseProfileImage";
import "./ServeBaseProfilePhoto.css";

export function ProfileAvatar({ photo, name, className = "" }: {
  photo?: string; name: string; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("") || "SB";
  return <span className={`sb-profile-avatar ${className}`} aria-hidden="true">
    {photo && isProfilePhoto(photo) && !failed
      ? <img src={photo} alt="" width="256" height="256" decoding="async" onError={() => setFailed(true)} />
      : initials}
  </span>;
}

export function ProfilePhotoPicker({ value = "", onChange, onBusyChange, name, disabled = false }: {
  value?: string; onChange: (value: string) => void;
  onBusyChange?: (busy: boolean) => void; name: string; disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => () => { revision.current++; }, []);
  function setProcessing(next: boolean) { setBusy(next); onBusyChange?.(next); }
  async function select(file?: File) {
    if (!file || disabled) return;
    const current = ++revision.current;
    setError(""); setStatus(""); setProcessing(true);
    try {
      const photo = await prepareProfilePhoto(file);
      if (current !== revision.current) return;
      onChange(photo);
      setStatus("Photo ready. It will be saved with your profile.");
    } catch (reason) {
      if (current === revision.current)
        setError(reason instanceof Error ? reason.message : "Choose another image and try again.");
    } finally {
      if (current === revision.current) setProcessing(false);
    }
  }
  function remove() {
    revision.current++;
    setProcessing(false); onChange(""); setError(""); setStatus("Photo removed. Your initials will appear instead.");
    if (input.current) input.current.value = "";
  }
  return <div className="sb-photo-picker" role="group" aria-labelledby={`${id}-label`} aria-busy={busy}>
    <ProfileAvatar className="sb-photo-preview" name={name} photo={value} />
    <div className="sb-photo-content">
      <div className="sb-photo-label" id={`${id}-label`}>Profile photo <span>Optional</span></div>
      <p id={`${id}-help`}>JPG, PNG, or WebP · up to 5 MB. Centered and resized to a square.</p>
      <input ref={input} id={id} className="sb-photo-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} tabIndex={-1}
        aria-label="Choose profile photo" aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
        onChange={event => { void select(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
      <div className="sb-photo-actions">
        <button type="button" disabled={disabled} onClick={() => input.current?.click()}>{value ? "Replace photo" : "Add photo"}</button>
        {(value || busy) && <button className="sb-photo-remove" type="button" disabled={disabled} onClick={remove}>{busy ? "Cancel" : "Remove"}</button>}
      </div>
      <p className="sb-photo-status" role="status">{busy ? "Preparing your photo…" : status}</p>
      {error && <p className="sb-photo-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  </div>;
}
