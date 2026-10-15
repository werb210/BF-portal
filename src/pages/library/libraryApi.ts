// BF_PORTAL_v810_LIBRARY_PLUS - calls for the Dropbox-style Staff Library (BF-Server v810, /api/o365/library/...).
// OneDrive calls ask for Files.ReadWrite when they are used, like the rest of the library.
import { api } from "@/api";
import { withO365Scopes } from "@/api/o365Interceptor";
import { FILES_READWRITE_SCOPES } from "@/auth/o365Scopes";
import { apiBlob } from "@/utils/api";

export type Item = {
  id: string; name: string; webUrl: string | null; size: number | null; lastModified: string | null; isFolder: boolean;
  mimeType?: string | null; modifiedBy?: string | null; childCount?: number | null; thumbnailUrl?: string | null; parentId?: string | null;
};
export type Preview = { kind: "image" | "video" | "pdf" | "office"; embedUrl: string | null; downloadUrl: string | null; webUrl: string | null; item: Item };
export type Client = { id: string; name: string; email: string | null; phone: string | null; application_id: string | null };

const L = "/api/o365/library";
const enc = encodeURIComponent;
const graph = <T,>(call: () => Promise<T>, interactive = false) =>
  withO365Scopes(FILES_READWRITE_SCOPES, call, interactive ? { interactive: true } : undefined) as Promise<T>;

export const listFolder = (folderId: string | null) =>
  graph(() => api.get<{ configured?: boolean; url?: string; rootId?: string; items?: Item[] }>(L + (folderId ? "?item=" + enc(folderId) : "")));
export const search = (q: string) => graph(() => api.get<{ items?: Item[] }>(L + "/search?q=" + enc(q)));
export const preview = (id: string) => graph(() => api.get<Preview>(L + "/item/" + enc(id) + "/preview"));
export const rename = (id: string, name: string) => graph(() => api.patch<{ item?: Item }>(L + "/item/" + enc(id), { name }), true);
export const move = (id: string, folderId: string | null) => graph(() => api.post<{ item?: Item }>(L + "/item/" + enc(id) + "/move", { folderId: folderId ?? "" }), true);
export const remove = (id: string) => graph(() => api.delete<{ restoreDays?: number }>(L + "/item/" + enc(id)), true);
export const trash = () => graph(() => api.get<{ items?: any[]; days?: number }>(L + "/trash"));
export const restore = (id: string) => graph(() => api.post<{ toTop?: boolean }>(L + "/trash/" + enc(id) + "/restore", {}), true);
export const purge = (id: string) => graph(() => api.delete(L + "/trash/" + enc(id)), true);
export const stars = () => api.get<{ items?: any[] }>(L + "/stars");
export const setStar = (it: Item, starred: boolean) => api.put(L + "/item/" + enc(it.id) + "/star", { starred, name: it.name, isFolder: it.isFolder });
export const recent = () => api.get<{ items?: any[] }>(L + "/recent");
export const activity = () => api.get<{ items?: any[] }>(L + "/activity");
export const versions = (id: string) => graph(() => api.get<{ versions?: any[] }>(L + "/item/" + enc(id) + "/versions"));
export const restoreVersion = (id: string, vid: string) => graph(() => api.post(L + "/item/" + enc(id) + "/versions/" + enc(vid) + "/restore", {}), true);
export const shareLink = (id: string, o: { expiresDays: number; password: string; allowDownload: boolean }) =>
  graph(() => api.post<{ url?: string; expiresAt?: string }>(L + "/item/" + enc(id) + "/share", o), true);
export const shareLinks = () => api.get<{ items?: any[] }>(L + "/shares");
export const revokeShare = (id: string) => api.delete(L + "/shares/" + enc(id));
export const fileRequest = (o: { folderId: string | null; title: string; expiresDays: number }) =>
  graph(() => api.post<{ url?: string; expiresAt?: string }>(L + "/requests", { ...o, folderId: o.folderId ?? "" }), true);
export const fileRequests = () => api.get<{ items?: any[] }>(L + "/requests");
export const closeRequest = (id: string) => api.delete(L + "/requests/" + enc(id));
export const clients = (q: string) => api.get<{ items?: Client[] }>(L + "/clients?q=" + enc(q));
export const content = (id: string) => graph(() => api.get<{ name: string; contentType: string; size: number; dataUrl: string }>(L + "/item/" + enc(id) + "/content"));
export const logSent = (it: Item, how: "portal" | "email" | "text", to: string) => api.post(L + "/item/" + enc(it.id) + "/sent", { name: it.name, how, to });

// Download a folder as a zip and save it.
export async function downloadZip(folderId: string | null, name: string): Promise<void> {
  const blob = await apiBlob(L + "/zip" + (folderId ? "?item=" + enc(folderId) : ""));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = (name || "Staff Library") + ".zip";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

// "Send to client": a file of 3 MB or less goes as an attachment, anything bigger as a 7-day download link.
export async function sendToClient(it: Item, c: Client, how: "portal" | "email" | "text", note: string): Promise<string> {
  const SMALL = 3 * 1024 * 1024;
  const small = it.size != null && it.size <= SMALL && how !== "text";
  const file = small ? await content(it.id) : null;
  const link = file ? null : (await shareLink(it.id, { expiresDays: 7, password: "", allowDownload: true })).url ?? "";
  const intro = note.trim() || "Here is " + it.name + " from Boreal Financial.";
  if (how === "portal") {
    if (!c.application_id && !c.id) throw new Error("This contact has no client portal yet.");
    await api.post("/api/communications/messages/send", {
      applicationId: c.application_id ?? undefined, contactId: c.id,
      body: link ? intro + "\n" + it.name + ": " + link : intro,
      attachments: file ? [{ name: file.name, contentType: file.contentType, dataUrl: file.dataUrl }] : [],
    });
  } else if (how === "email") {
    if (!c.email) throw new Error("This contact has no email address.");
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    await api("/api/o365/mail/send", {
      method: "POST",
      body: {
        to: [c.email], cc: [], bcc: [], subject: it.name,
        body_html: "<p>" + esc(intro) + "</p>" + (link ? '<p><a href="' + link + '">' + esc(it.name) + "</a> (link works for 7 days)</p>" : ""),
        attachments: file ? [{ name: file.name, contentType: file.contentType, contentBytes: file.dataUrl.replace(/^data:[^,]*,/, "") }] : [],
        log_contact_id: c.id,
      },
    });
  } else {
    if (!c.phone) throw new Error("This contact has no mobile number.");
    await api.post("/api/communications/sms", { to: c.phone, contactId: c.id, applicationId: c.application_id ?? undefined, body: intro + " " + link });
  }
  await logSent(it, how, c.name).catch(() => undefined);
  return file ? "attached" : "link";
}
