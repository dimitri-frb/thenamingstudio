// Google Ads conversion tracking. DORMANT until the ids are set: nothing
// loads, nothing fires, zero bytes of Google script for anyone — until
// AW_ID and a label are filled in (via repo variables or the fallbacks).
//
// To turn it on: in Google Ads create two conversion actions ("Sign up" and
// "Name claimed"), then paste the AW-id and the two labels below (or set
// VITE_AW_ID / VITE_AW_SIGNUP / VITE_AW_CLAIM as repo variables) and deploy.
const AW_ID: string = (import.meta as any).env?.VITE_AW_ID || "";        // e.g. "AW-123456789"
const LABEL_SIGNUP: string = (import.meta as any).env?.VITE_AW_SIGNUP || ""; // e.g. "AbCdEfGhIj0"
const LABEL_CLAIM: string = (import.meta as any).env?.VITE_AW_CLAIM || "";

let booted = false;
function boot() {
  if (booted || !AW_ID) return;
  booted = true;
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.gtag = w.gtag || function gtag() { w.dataLayer.push(arguments); };
  w.gtag("js", new Date());
  w.gtag("config", AW_ID);
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(AW_ID)}`;
  document.head.appendChild(s);
}

function fire(label: string) {
  if (!AW_ID || !label) return;
  try {
    boot();
    (window as any).gtag("event", "conversion", { send_to: `${AW_ID}/${label}` });
  } catch { /* best effort */ }
}

export const convSignup = () => fire(LABEL_SIGNUP);
export const convClaim = () => fire(LABEL_CLAIM);
