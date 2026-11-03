// "Open in Google Slides / Docs": the file goes into the founder's own Google
// Drive, converted to a native Slides deck or Doc, then opens in a new tab.
// Uses Google Identity Services with the drive.file scope (only files this
// app creates). Any failure (scope not granted, API off, popup blocked) falls
// back to a plain download, so the founder always gets the file.
import { GOOGLE_CLIENT_ID, loadGsi } from "./api";
import { download } from "./zip";

const SCOPE = "https://www.googleapis.com/auth/drive.file";
let token: { v: string; exp: number } | null = null;

/** Load Google's script ahead of the click, so the consent popup opens inside the tap. */
export function prepareGoogle(): void { if (GOOGLE_CLIENT_ID) loadGsi(() => {}); }

function getToken(): Promise<string> {
  if (token && token.exp > Date.now() + 60000) return Promise.resolve(token.v);
  return new Promise((resolve, reject) => {
    const g = (window as any).google?.accounts?.oauth2;
    if (!g || !GOOGLE_CLIENT_ID) { reject(new Error("google not ready")); return; }
    const client = g.initTokenClient({
      client_id: GOOGLE_CLIENT_ID, scope: SCOPE,
      callback: (r: any) => {
        if (r?.access_token) { token = { v: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3000) * 1000 }; resolve(r.access_token); }
        else reject(new Error(r?.error || "no token"));
      },
      error_callback: (e: any) => reject(new Error(e?.type || "popup")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

export type GTarget = "presentation" | "document";
/**
 * Must be called straight from a click (the consent popup needs the tap).
 * `make` builds the file; it is uploaded and converted to `target`.
 * Returns the file's link, or "" after the download fallback.
 */
export async function openInGoogle(make: () => Promise<{ blob: Blob; name: string; mime: string; fallbackName: string }>, target: GTarget): Promise<string> {
  try {
    const tokP = getToken();
    const [tok, f] = await Promise.all([tokP, make()]);
    const meta = { name: f.name, mimeType: `application/vnd.google-apps.${target}` };
    const boundary = "nn" + Math.random().toString(36).slice(2);
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`,
      `--${boundary}\r\nContent-Type: ${f.mime}\r\n\r\n`, f.blob, `\r\n--${boundary}--`,
    ]);
    const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
      method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body,
    });
    if (!r.ok) throw new Error(`drive ${r.status}`);
    const j = await r.json();
    const url = j.webViewLink || `https://docs.google.com/${target === "presentation" ? "presentation" : "document"}/d/${j.id}/edit`;
    return url;
  } catch {
    const f = await make();
    download(f.blob, f.fallbackName);
    return "";
  }
}
