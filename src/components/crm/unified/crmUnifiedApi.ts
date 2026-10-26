// BF_PORTAL_v856_CRM_UNIFY - one set of CRM components for every silo. They talk to the same contract on both
// servers: BF-Server /api/crm/unified/* for BF, SLF and KS (the api client sends the silo: X-Silo from the topbar, or
// KS on /silo/ks/crm pages) and BI-Server /api/v1/bi/crm/unified/* for BI. A backend says which, and where records
// link to in the portal.
import { useMemo } from "react";
import { api } from "@/api";
import { useCrmBase } from "@/pages/crm/crmBase";

export type CrmEntity = "contact" | "company";
export type CrmBackend = { kind: "bf" | "bi"; base: string; linkBase: string; contactsPath: string };

export const BI_CRM_BACKEND: CrmBackend = {
  kind: "bi",
  base: "/api/v1/bi/crm",
  linkBase: "/silo/bi/crm",
  contactsPath: "/api/v1/bi/crm/contacts",
};

/** The BF-Server backend for the CRM screens under /crm (BF, SLF) and /silo/ks/crm (KS). */
export function useBfCrmBackend(): CrmBackend {
  const linkBase = useCrmBase();
  return useMemo(() => ({ kind: "bf" as const, base: "/api/crm", linkBase, contactsPath: "/api/crm/contacts" }), [linkBase]);
}

export type TagKind = "core" | "custom" | "system" | "other";
export type TagUsage = { tag: string; label: string; kind: TagKind; contacts: number; companies: number };
export type TagCatalogue = {
  core: Array<{ slug: string; label: string; kind: TagKind }>;
  custom: Array<{ slug: string; label: string; kind: TagKind }>;
  system: string[];
  inUse: TagUsage[];
};

// The same lists the servers use (src/modules/crmUnify/tags.ts), so chips render before the catalogue arrives.
export const CORE_TAGS: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: "lender", label: "Lender" },
  { slug: "broker", label: "Broker" },
  { slug: "lawyer", label: "Lawyer" },
  { slug: "accountant", label: "Accountant/Bookkeeper" },
  { slug: "referrer", label: "Referrer" },
  { slug: "active", label: "Active" },
  { slug: "insurance", label: "Insurance" },
  { slug: "ar_credit_insurance", label: "A/R Credit Insurance" },
];
export const SYSTEM_TAGS: ReadonlyArray<string> = [
  "application_started", "applicant", "applicant_otp", "contact_form", "booked_call", "booking", "credit_readiness",
  "email", "test", "referral", "startup_capital", "startup_waitlist", "maya", "website", "import", "imported",
  "apollo", "newsletter", "unsubscribed", "sms_opt_out", "otp", "demo_signup", "website_signup", "licensee",
  "pgi", "bi_referral", "lead_magnet", "readiness",
  "partner", "guarantor", "advisor",
];
const SYNONYMS: Record<string, string> = {
  contactform: "contact_form", contact_us: "contact_form", website_contact_form: "contact_form", lenders: "lender",
  brokers: "broker", lawyers: "lawyer", attorney: "lawyer", referrers: "referrer", bookkeeper: "accountant",
  book_keeper: "accountant", accountants: "accountant", accountant_bookkeeper: "accountant", account_book_keeper: "accountant",
  accountant_book_keeper: "accountant", accountant_advisor: "accountant", cpa: "accountant", booked_a_call: "booked_call",
  application_start: "application_started", credit_readiness_check: "credit_readiness",
  lawyer_advisor: "lawyer", attorney_advisor: "lawyer", insurance_advisor: "insurance",
  a_r_credit_insurance_advisor: "ar_credit_insurance", a_r_credit_insurance: "ar_credit_insurance",
  ar_credit_insurance_advisor: "ar_credit_insurance", accounts_receivable_credit_insurance: "ar_credit_insurance",
};

export function normalizeTag(raw: unknown): string {
  const x = String(raw ?? "").trim().toLowerCase().replace(/[\s/-]+/g, "_").replace(/[^a-z0-9_:]/g, "").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return SYNONYMS[x] ?? x;
}

export function tagKindOf(tag: string, catalogue?: TagCatalogue | null): TagKind {
  const t = normalizeTag(tag);
  if (CORE_TAGS.some((c) => c.slug === t)) return "core";
  if (SYSTEM_TAGS.includes(t)) return "system";
  if (catalogue?.custom.some((c) => c.slug === t)) return "custom";
  return "other";
}

export function tagLabel(tag: string, catalogue?: TagCatalogue | null): string {
  const t = normalizeTag(tag);
  return CORE_TAGS.find((c) => c.slug === t)?.label ?? catalogue?.custom.find((c) => c.slug === t)?.label ?? t;
}

/** Staff tags offered in "Tag as..." / "Remove tag": the shared list, the silo's own, then older ones in use. */
export function staffTagOptions(catalogue?: TagCatalogue | null): Array<{ slug: string; label: string }> {
  const out = new Map<string, string>();
  for (const t of CORE_TAGS) out.set(t.slug, t.label);
  for (const t of catalogue?.custom ?? []) out.set(t.slug, t.label);
  for (const t of catalogue?.inUse ?? []) if (t.kind === "other" && !out.has(t.tag)) out.set(t.tag, t.label);
  return Array.from(out, ([slug, label]) => ({ slug, label }));
}

/** +14035550123 -> (403) 555-0123; other numbers as stored. */
export function formatPhone(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d.length === 10 && !raw.startsWith("+") ? d : null;
  return ten ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : raw;
}

export type Person = {
  key: string; contactId: string | null; name: string; email: string | null; phone: string | null;
  role: string; roleLabel: string; detail: string | null; source: string;
  group: "primary" | "partners" | "guarantors" | "advisors" | "other";
};
export type PeopleResponse = { groups: Record<Person["group"], Person[]>; people: Person[]; roles: Record<string, string> };
export type DetailField = { key: string; label: string; value: string | null; raw?: string | null; source: "company" | "application" | null; editable: boolean; type: string };
export type DuplicateCandidate = { id: string; name: string | null; email: string | null; phone: string | null; company_name: string | null; created_at: string | null; reasons: string[]; placeholder?: boolean };
export type DuplicateGroup = { ids: string[]; records: Array<Record<string, any>>; reasons: string[]; survivorId?: string; placeholders?: number };
export type DuplicatesResponse = { count: number; candidates: DuplicateCandidate[]; mergedInto?: string; mergedIntoName?: string | null; archived?: boolean };
export type PanelPerson = { contactId: string | null; name: string; role: string; email: string | null; phone: string | null };
export type PanelApplication = {
  id: string; business: string | null; amount: number | null; product: string | null; stage: string | null; submitted: boolean;
  submittedAt: string | null; createdAt: string | null; role: string; partners: PanelPerson[]; link: string;
};
export type RelatedPerson = { contactId: string; name: string; email: string | null; phone: string | null; company: string | null; detail: string | null; direction: "advisor" | "client" };
export type SurvivorInfo = { id: string; requestedId: string; merged: boolean; archived: boolean; missing: boolean; name: string | null };
export type PlaceholderPlan = { groups: number; contacts?: number; merged?: number; plan?: Array<{ survivorId: string; survivorName: string | null; loserIds: string[] }>; failed?: Array<{ survivorId: string; error: string }> };
export type MergePreview = {
  records: Array<{ id: string; title: string; tags: string[]; created_at: string | null; application_count: number; contact_count?: number }>;
  fields: Array<{ key: string; label: string; values: Array<{ id: string; value: string | null; display: string | null }> }>;
};
export type CleanupChange = { entity: CrmEntity; entityId: string; record: string; field: string; before: string; after: string; reason: string };
export type CleanupBatch = { id: string; created_at: string; change_count: number; undone_at: string | null; created_by_name: string | null };
export type SummarySource = { type: string; label: string; detail?: string | null; url?: string | null; status?: "used" | "skipped" | "unavailable" };
export type SummaryPayload = { summary: string; business: string | null; sources: SummarySource[]; generatedAt: string; cached: boolean };
export type KsLicensee = {
  stage: string | null; companyName: string | null; companyCode: string | null; plan: string | null; seats: number | null; status: string | null;
  demo: { openedAt: string | null; steps: number; completedAt: string | null };
  payment: { status: string; lastAt: string | null; summary: string | null };
  lastEvent: { at: string | null; summary: string | null; type: string | null };
};

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);

// Every call returns a promise, even when the api client is missing a method (tests, older shells): a failure
// becomes a rejected promise the caller already handles instead of an exception thrown during render.
const get = <T>(path: string) => Promise.resolve().then(() => api.get<T>(path));
const post = <T>(path: string, body?: unknown) => Promise.resolve().then(() => api.post<T>(path, body));
const patch = <T>(path: string, body?: unknown) => Promise.resolve().then(() => api.patch<T>(path, body));
const del = <T>(path: string) => Promise.resolve().then(() => api.delete<T>(path));

export function crmUnified(b: CrmBackend) {
  const u = `${b.base}/unified`;
  return {
    async tags(): Promise<TagCatalogue | null> {
      const r = await get<TagCatalogue>(`${u}/tags`);
      return isObj(r) && Array.isArray((r as TagCatalogue).inUse) ? (r as TagCatalogue) : null;
    },
    applyTags: (entity: CrmEntity, ids: string[], add: string[], remove: string[]) =>
      post<{ ok: boolean; updated: number }>(`${u}/tags/apply`, { entity, ids, add, remove }),
    addTagDefinition: (label: string) => post(`${u}/tags/definitions`, { label }),
    removeTagDefinition: (slug: string) => del(`${u}/tags/definitions/${encodeURIComponent(slug)}`),
    people: (companyId: string) => get<PeopleResponse>(`${u}/companies/${companyId}/people`),
    addPerson: (companyId: string, body: { contactId?: string; contact?: { name: string; email?: string; phone?: string }; role: string }) =>
      post(`${u}/companies/${companyId}/people`, body),
    removePerson: (companyId: string, p: Pick<Person, "key" | "contactId" | "email" | "name">) =>
      post(`${u}/companies/${companyId}/people/remove`, { key: p.key, contactId: p.contactId, email: p.email, name: p.name }),
    details: (companyId: string) => get<{ fields: DetailField[]; tags: string[] }>(`${u}/companies/${companyId}/details`),
    saveDetails: (companyId: string, changes: Record<string, unknown>) => patch<{ fields: DetailField[] }>(`${u}/companies/${companyId}/details`, changes),
    duplicates: (entity: CrmEntity, id: string) => get<DuplicatesResponse>(`${u}/duplicates/${entity}/${id}`),
    mergePlaceholders: (dryRun: boolean) => post<PlaceholderPlan>(`${u}/duplicates/merge-placeholders`, { dryRun }),
    contactApplications: (contactId: string) => get<{ applications: PanelApplication[]; drafts: number }>(`${u}/contacts/${contactId}/applications`),
    contactRelated: (contactId: string) => get<RelatedPerson[]>(`${u}/contacts/${contactId}/related`),
    survivor: (contactId: string) => get<SurvivorInfo>(`${u}/contacts/${contactId}/survivor`),
    duplicateGroups: (entity: CrmEntity) => get<{ entity: CrmEntity; groups: DuplicateGroup[] }>(`${u}/duplicates?entity=${entity}`),
    dismissDuplicates: (entity: CrmEntity, ids: string[]) => post(`${u}/duplicates/dismiss`, { entity, ids }),
    mergePreview: (entity: CrmEntity, ids: string[]) => get<MergePreview>(`${u}/merge/${entity}/preview?ids=${ids.join(",")}`),
    merge: (entity: CrmEntity, survivorId: string, loserIds: string[], fields: Record<string, string | null>) =>
      post(`${u}/merge/${entity}`, { survivorId, loserIds, fields }),
    cleanupScan: (entity: CrmEntity) => get<{ entity: CrmEntity; changes: CleanupChange[] }>(`${u}/cleanup/scan?entity=${entity}`),
    cleanupApply: (changes: CleanupChange[]) => post<{ batchId: string; applied: number; skipped: unknown[] }>(`${u}/cleanup/apply`, { changes }),
    cleanupBatches: () => get<CleanupBatch[]>(`${u}/cleanup/batches`),
    cleanupUndo: (batchId: string) => post<{ restored: number }>(`${u}/cleanup/batches/${batchId}/undo`, {}),
    summary: (entity: CrmEntity, id: string) => get<SummaryPayload | null>(`${u}/ai-summary/${entity}/${id}`),
    generateSummary: (entity: CrmEntity, id: string) => post<SummaryPayload>(`${u}/ai-summary/${entity}/${id}`, {}),
    ksLicensee: (contactId: string) => get<KsLicensee | null>(`${u}/contacts/${contactId}/ks-licensee`),
    async searchContacts(q: string): Promise<Array<{ id: string; name: string; email: string | null }>> {
      const r = await get<any>(`${b.contactsPath}?q=${encodeURIComponent(q)}&search=${encodeURIComponent(q)}&pageSize=10`);
      const list: any[] = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : Array.isArray(r?.data) ? r.data : [];
      return list.slice(0, 10).map((c) => ({ id: String(c.id), name: String(c.name ?? c.full_name ?? c.email ?? "(no name)"), email: c.email ?? null }));
    },
  };
}

export function errorText(err: unknown, fallback: string): string {
  const e = err as { message?: string; details?: { message?: string; error?: string } };
  return e?.details?.message ?? (typeof e?.message === "string" && e.message.trim() ? e.message : fallback);
}
