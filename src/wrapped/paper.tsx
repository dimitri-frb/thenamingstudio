// Shared chrome for the white "paper" pages (My names, Admin, Settings):
// the avatar menu with view switching, and the settings pane.
import { useEffect, useRef, useState } from "react";
import { accountDelete, profileSet, type WUser } from "./api";

export const BASE = () => (import.meta as any).env.BASE_URL || "/";

export function AvatarMenu({ me, isAdmin, current, onLogout }: {
  me: WUser; isAdmin: boolean; current: "account" | "admin"; onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="avwrap" ref={ref}>
      <button className="avatar" onClick={() => setOpen((o) => !o)}>{(me.name || me.email || "?")[0].toUpperCase()}</button>
      {open && (
        <div className="menu">
          <p className="who"><b>{me.name || "Founder"}</b><span>{me.email}</span></p>
          <p className="lbl">Switch view</p>
          <a className={current === "account" ? "on" : ""} href={BASE() + "account"}>My names {current === "account" ? "✓" : ""}</a>
          {isAdmin && <a className={current === "admin" ? "on" : ""} href={BASE() + "admin"}>Admin <i className="tag">Admin</i> {current === "admin" ? "✓" : ""}</a>}
          <a href={BASE() + "settings"}>Settings</a>
          <button onClick={onLogout}>Log out</button>
        </div>
      )}
    </div>
  );
}

export function SettingsPane({ me }: { me: WUser }) {
  const [name, setName] = useState(me.name || "");
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sure, setSure] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="kset">
      <h2>Settings</h2>
      <div className="panelcard">
        <p className="lbl">Profile</p>
        <label className="frow">
          <em>Name</em>
          <span className="editrow">
            <input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
            <button disabled={!name.trim() || name === me.name} onClick={async () => { if (await profileSet(name.trim())) setSaved(true); }}>
              {saved ? "Saved ✓" : "Save"}
            </button>
          </span>
        </label>
        <label className="frow">
          <em>Email</em>
          <span className="mono dim">{me.email} <i>(Google, read-only)</i></span>
        </label>
      </div>
      <div className="panelcard danger">
        <p className="lbl">Delete account</p>
        <p className="copy">Removes your profile, every flow and your saved names. Domains you registered stay yours. This can't be undone.</p>
        {!confirming ? (
          <button className="delbtn" onClick={() => setConfirming(true)}>Delete my account</button>
        ) : (
          <span className="editrow">
            <input placeholder='Type "DELETE" to confirm' value={sure} onChange={(e) => setSure(e.target.value)} />
            <button className="delbtn solid" disabled={sure !== "DELETE" || busy} onClick={async () => {
              setBusy(true);
              if (await accountDelete()) window.location.assign(BASE());
              else setBusy(false);
            }}>{busy ? "…" : "Delete forever"}</button>
          </span>
        )}
      </div>
    </div>
  );
}
