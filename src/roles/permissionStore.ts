// BF_PORTAL_v870_CRM_DATA_MODEL - what the signed-in person's role lets them do, from GET /api/roles/me (BF-Server).
//
// Used to HIDE what a role cannot do (nav sections, settings tabs, buttons). The server enforces every permission
// itself, so this is only about not showing dead ends. Safety rule: until the server answers,
// or when it cannot (404 on an older server, network), nothing is hidden - the portal behaves as before custom roles.
import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/api";

export const AREAS = [
  "contacts", "companies", "applications", "lenders", "documents", "communications", "calls", "marketing", "reports",
  "settings", "billing", "users",
] as const;
export type Area = (typeof AREAS)[number];
export const ACTIONS = ["view", "create", "edit", "delete", "export"] as const;
export type Action = (typeof ACTIONS)[number];
export type PermissionSet = Record<Area, Record<Action, boolean>>;
export type Visibility = "all" | "team" | "own";
export type BaseRole = "Admin" | "Ops" | "Staff" | "Marketing";

export const AREA_LABELS: Record<Area, string> = {
  contacts: "Contacts",
  companies: "Companies",
  applications: "Applications and deals",
  lenders: "Lenders and products",
  documents: "Documents",
  communications: "Email, texts and inbox",
  calls: "Calls and recordings",
  marketing: "Marketing",
  reports: "Reports",
  settings: "Settings",
  billing: "QuickBooks and fee invoices",
  users: "Users, teams and roles",
};
export const ACTION_LABELS: Record<Action, string> = { view: "View", create: "Create", edit: "Edit", delete: "Delete", export: "Export" };

export type MyPermissions = {
  /** "server" once GET /api/roles/me answered; "fallback" before that or when unavailable (nothing hidden). */
  source: "server" | "fallback";
  role: string | null;
  customRole: { id: string; name: string; base_role: BaseRole } | null;
  fullAdmin: boolean;
  permissions: PermissionSet | null;
  visibility: Visibility;
};

export function fallbackPermissions(): MyPermissions {
  return { source: "fallback", role: null, customRole: null, fullAdmin: false, permissions: null, visibility: "all" };
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** A complete matrix from any input (unknown keys dropped, missing ones false). */
export function normalizePermissionSet(raw: unknown): PermissionSet {
  const r = obj(raw);
  const out = {} as PermissionSet;
  for (const area of AREAS) {
    const a = obj(r[area]);
    out[area] = { view: a.view === true, create: a.create === true, edit: a.edit === true, delete: a.delete === true, export: a.export === true };
  }
  return out;
}

export function normalizeMe(raw: unknown): MyPermissions | null {
  const r = obj(raw);
  if (r.ok === false || !r.permissions) return null;
  const c = obj(r.custom_role);
  const vis = r.record_visibility === "team" || r.record_visibility === "own" ? r.record_visibility : "all";
  return {
    source: "server",
    role: typeof r.role === "string" ? r.role : null,
    customRole: typeof c.id === "string" ? { id: c.id, name: String(c.name ?? ""), base_role: String(c.base_role ?? "Staff") as BaseRole } : null,
    fullAdmin: r.full_admin === true,
    permissions: normalizePermissionSet(r.permissions),
    visibility: vis,
  };
}

let current: MyPermissions = fallbackPermissions();
const listeners = new Set<() => void>();
function set(next: MyPermissions) {
  current = next;
  listeners.forEach((l) => l());
}
export const getPermissions = (): MyPermissions => current;

/** Can the signed-in person do this? Always true until the server has answered (nothing is hidden by mistake). */
export function can(area: Area, action: Action = "view", state: MyPermissions = current): boolean {
  if (state.source !== "server" || !state.permissions) return true;
  return state.permissions[area]?.[action] === true;
}

let inFlight: Promise<MyPermissions> | null = null;
export function loadPermissions(): Promise<MyPermissions> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const next = normalizeMe(await api.get<unknown>("/api/roles/me"));
      set(next ?? fallbackPermissions());
    } catch {
      // Keep what we have; an older server (404) or a blip never hides anything.
      if (current.source !== "server") set(fallbackPermissions());
    } finally {
      inFlight = null;
    }
    return current;
  })();
  return inFlight;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function usePermissions(): MyPermissions {
  return useSyncExternalStore(subscribe, getPermissions, getPermissions);
}

/** React hook: can(area, action) that re-renders when the permissions load. */
export function useCan(area: Area, action: Action = "view"): boolean {
  return can(area, action, usePermissions());
}

const FOCUS_REFRESH_MS = 30_000;
/** Mount once in the signed-in layout. */
export function usePermissionsBootstrap(signedIn: boolean): void {
  useEffect(() => {
    if (!signedIn) {
      if (current.source !== "fallback") set(fallbackPermissions());
      return;
    }
    let last = Date.now();
    void loadPermissions();
    const onFocus = () => {
      if (Date.now() - last < FOCUS_REFRESH_MS) return;
      last = Date.now();
      void loadPermissions();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [signedIn]);
}

/** Tests only. */
export function __setPermissionsForTests(next: MyPermissions | null): void {
  inFlight = null;
  set(next ?? fallbackPermissions());
}
