// BF_PORTAL_BLOCK_v210_OUTREACH_KANBAN_v1
// Full replace of the flat Outreach list with a Kanban pipeline board.
// Pairs with BI-Server v251/v409/v410/v411 endpoints under
// /api/v1/bi/crm/outreach/*. All data handlers and sub-components
// (logger, InviteButton, EnrollButton, ActivityTimeline, ProfilePanel)
// are preserved; the layout becomes a board with drag-between-stage
// columns, a lender/broker segment filter, and a "Start onboarding"
// action wired to v410.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom"; // BF_PORTAL_BLOCK_v744_OUTREACH_CARD_OPENS_CRM
import { api } from "@/api";

const PAGE = 100; // BF_PORTAL_BLOCK_v800_OUTREACH_PAGER_AND_BULK
const STAGES = [
  "new",
  "contacted",
  "engaged",
  "demo_booked",
  "demo_completed",
  "onboarding",
  "active",
] as const;
type Stage = (typeof STAGES)[number];

const ARCHIVE_STAGE = "not_interested" as const;

const LEGACY_MAP: Record<string, Stage | typeof ARCHIVE_STAGE> = {
  cold: "new",
  attempting: "contacted",
  voicemail: "contacted",
  engaged: "engaged",
  demo_booked: "demo_booked",
  demo_completed: "demo_completed",
  lender: "active",
  not_interested: ARCHIVE_STAGE,
};

const ALL_STATUSES = [
  ...STAGES,
  ARCHIVE_STAGE,
  "cold",
  "attempting",
  "voicemail",
  "lender",
] as const;
type Status = (typeof ALL_STATUSES)[number];

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  engaged: "Engaged",
  demo_booked: "Demo Booked",
  demo_completed: "Demo Completed",
  onboarding: "Onboarding",
  active: "Active",
  not_interested: "Not Interested",
};

function stageOf(status: string | null): Stage | typeof ARCHIVE_STAGE {
  if (!status) return "new";
  if ((STAGES as readonly string[]).includes(status)) return status as Stage;
  if (status === ARCHIVE_STAGE) return ARCHIVE_STAGE;
  return LEGACY_MAP[status] ?? "new";
}

// BF_PORTAL_BI_OUTREACH_COUNTRY_BADGE_v1 — Canada and the US share the +1 country code, so the
// contact's country is derived from the NANP area code. Returns "CDN" for Canadian area codes,
// "US" for other +1 numbers, null when there is no usable phone (Andrew markets to CDN only).
const CDN_AREA_CODES = new Set([
  "204","226","236","249","250","263","289","306","343","354","365","367","368","382","387",
  "403","416","418","428","431","437","438","450","468","474","506","514","519","524","548",
  "579","581","584","587","604","613","639","647","672","683","705","709","742","753","778",
  "780","782","807","819","825","867","873","879","902","905",
]);
// BF_PORTAL_BI_OUTREACH_COUNTRY_FIELD_v1 — normalize the stored bi_contacts.country
// value (Apollo/import populate it in mixed forms) to the badge's CDN/US codes.
function normStoredCountry(raw: string | null | undefined): "CDN" | "US" | null {
  const v = String(raw ?? "").trim().toUpperCase();
  if (!v) return null;
  if (["CDN", "CA", "CAN", "CANADA"].includes(v)) return "CDN";
  if (["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"].includes(v)) return "US";
  return null;
}
// Prefer the real stored country; fall back to NANP area-code inference only when
// no usable stored value exists.
function resolveCountry(c: { country?: string | null; phone_e164: string | null }): "CDN" | "US" | null {
  return normStoredCountry(c.country) ?? countryFromPhone(c.phone_e164);
}
function countryFromPhone(phone: string | null): "CDN" | "US" | null {
  if (!phone) return null;
  let nanp = phone.replace(/[^0-9]/g, "");
  if (nanp.length === 11 && nanp.startsWith("1")) nanp = nanp.slice(1);
  if (nanp.length !== 10) return null;
  return CDN_AREA_CODES.has(nanp.slice(0, 3)) ? "CDN" : "US";
}

const EVENT_TYPES = ["call", "demo", "sms", "email", "note"] as const;
type EventType = (typeof EVENT_TYPES)[number];

const CALL_OUTCOMES = [
  { value: "spoke", label: "Spoke (→ engaged)" },
  { value: "voicemail", label: "Voicemail" },
  { value: "no_answer", label: "No answer" },
  { value: "booked", label: "Booked demo (→ demo_booked)" },
  { value: "not_interested", label: "Not interested (→ not_interested)" },
  { value: "wrong_number", label: "Wrong number" },
] as const;

type Contact = {
  id: string;
  full_name: string;
  email: string | null;
  phone_e164: string | null;
  title: string | null;
  notes: string | null;
  tags: string[] | null;
  country?: string | null; // BF_PORTAL_BI_OUTREACH_COUNTRY_FIELD_v1 — stored bi_contacts.country
  company_name?: string | null; // BF_PORTAL_BLOCK_v749_OUTREACH_COMPANY
  outreach_status: Status | null;
  outreach_owner_id: string | null;
  outreach_updated_at: string | null;
  outreach_segment: "lender" | "broker" | null;
  promoted_lender_id: string | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  contact_id: string;
  actor_id: string | null;
  actor_name: string | null;
  event_type: string;
  outcome: string | null;
  body: string | null;
  created_at: string;
};

type StaffProfile = {
  staff_user_id: string;
  display_name: string | null;
  bookings_url: string | null;
  phone_e164: string | null;
};

export default function BIOutreach() {
  const [segment, setSegment] = useState<string>("");
  const [q, setQ] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // BF_PORTAL_BLOCK_v800_OUTREACH_PAGER_AND_BULK
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [loadedOffset, setLoadedOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  // BF_PORTAL_BLOCK_v744_OUTREACH_CARD_OPENS_CRM — pipeline card opens the full BI CRM contact view.
  const navigate = useNavigate();
  const openContact = (id: string) => navigate(`/silo/bi/crm/contacts/${id}`, { state: { from: "outreach" } });
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number; // BF_PORTAL_BLOCK_v802_IMPORT_COUNTS (v799 upsert/suppress)
    suppressed: number;
    skipped: number;
    total: number;
    results?: Array<{ row: number; ok: boolean; error?: string }>;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [sequences, setSequences] = useState<ReadonlyArray<{ id: string; name: string; is_active: boolean }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", String(PAGE));
      params.set("offset", "0");
      const r: any = await api(`/api/v1/bi/crm/outreach/contacts?${params}`);
      const rows: Contact[] = Array.isArray(r?.contacts) ? r.contacts : [];
      setContacts(rows);
      setTotal(typeof r?.total === "number" ? r.total : rows.length);
      setLoadedOffset(rows.length);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  }, [q]);

  // BF_PORTAL_BLOCK_v800_OUTREACH_PAGER_AND_BULK — append the next page (v791 offset/total).
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", String(PAGE));
      params.set("offset", String(loadedOffset));
      const r: any = await api(`/api/v1/bi/crm/outreach/contacts?${params}`);
      const more: Contact[] = Array.isArray(r?.contacts) ? r.contacts : [];
      setContacts((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...more.filter((c) => !seen.has(c.id))];
      });
      setLoadedOffset((o) => o + more.length);
      if (typeof r?.total === "number") setTotal(r.total);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load more.");
    } finally {
      setLoadingMore(false);
    }
  }, [q, loadedOffset]);

  // BF_PORTAL_BLOCK_v800_OUTREACH_PAGER_AND_BULK — selection + two-mode mass action (v799).
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const bulkAction = useCallback(async (mode: "remove_from_outreach" | "delete_from_crm") => {
    const ids = Array.from(selectedIds);
    if (!ids.length || bulkBusy) return;
    if (mode === "delete_from_crm" && !window.confirm(`Permanently delete ${ids.length} contact(s) from the CRM and block re-import? This cannot be undone.`)) return;
    setBulkBusy(true);
    try {
      await api.post(`/api/v1/bi/crm/outreach/contacts/bulk-action`, { ids, mode });
      clearSelection();
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Bulk action failed.");
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, bulkBusy, clearSelection, load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r: any = await api(`/api/v1/bi/apollo/sequences`);
        if (cancelled) return;
        const list: Array<{ id: string; name: string; is_active: boolean }> =
          Array.isArray(r?.sequences)
            ? r.sequences.filter((s: any) => s && s.is_active !== false)
            : [];
        setSequences(list);
      } catch {
        /* leave empty; row button degrades to disabled */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const r: any = await api(`/api/v1/bi/crm/outreach/me/profile`);
      setProfile(r?.profile ?? null);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (profileOpen && !profile) void loadProfile();
  }, [profileOpen, profile, loadProfile]);

  async function saveProfile(next: { display_name?: string; bookings_url?: string; phone_e164?: string }) {
    setProfileSaving(true);
    try {
      await api(`/api/v1/bi/crm/outreach/me/profile`, {
        method: "PUT",
        body: next,
      } as any);
      await loadProfile();
    } finally {
      setProfileSaving(false);
    }
  }

  async function logActivity(
    contactId: string,
    payload: { event_type: EventType; outcome?: string; body?: string },
  ) {
    await api(`/api/v1/bi/crm/outreach/contacts/${contactId}/activity`, {
      method: "POST",
      body: payload,
    } as any);
    await load();
  }

  async function changeStatus(contactId: string, newStatus: Status | "") {
    await api(`/api/v1/bi/crm/outreach/contacts/${contactId}`, {
      method: "PATCH",
      body: { outreach_status: newStatus === "" ? null : newStatus },
    } as any);
    await load();
  }

  async function startOnboarding(contactId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      await api(`/api/v1/bi/crm/outreach/contacts/${contactId}/start-onboarding`, {
        method: "POST",
        body: {},
      } as any);
      await load();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "onboarding_failed" };
    }
  }

  async function importFile(file: File) {
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r: any = await api(`/api/v1/bi/crm/outreach/import`, {
        method: "POST",
        body: fd,
      } as any);
      setImportResult({
        imported: Number(r?.imported ?? 0),
        updated: Number(r?.updated ?? 0),
        suppressed: Number(r?.suppressed ?? 0),
        skipped: Number(r?.skipped ?? 0),
        total: Number(r?.total ?? 0),
        results: Array.isArray(r?.results) ? r.results : [],
      });
      await load();
    } catch (e: any) {
      setImportError(e?.message ?? "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void importFile(f);
  }

  async function sendDemoInvite(contactId: string, customMessage?: string): Promise<{ ok: boolean; error?: string }> {
    try {
      await api(`/api/v1/bi/crm/outreach/contacts/${contactId}/demo-invite`, {
        method: "POST",
        body: customMessage ? { custom_message: customMessage } : {},
      } as any);
      await load();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "send_failed" };
    }
  }

  async function enrollInSequence(
    contactId: string,
    sequenceId: string,
  ): Promise<{ ok: boolean; mock?: boolean; error?: string }> {
    try {
      const r: any = await api(
        `/api/v1/bi/apollo/sequences/${sequenceId}/enroll/${contactId}`,
        { method: "POST", body: {} } as any,
      );
      return { ok: true, mock: Boolean(r?.mock) };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "enroll_failed" };
    }
  }

  const visible = useMemo(() => {
    if (!segment) return contacts;
    return contacts.filter((c) => c.outreach_segment === segment);
  }, [contacts, segment]);

  const columns = useMemo(() => {
    const map: Record<string, Contact[]> = {};
    for (const s of STAGES) map[s] = [];
    map[ARCHIVE_STAGE] = [];
    for (const c of visible) {
      const st = stageOf(c.outreach_status);
      (map[st] ?? map.new ?? []).push(c);
    }
    // BF_PORTAL_BI_OUTREACH_COUNTRY_SORT_v1 — order each column CDN first, then
    // unknown (no country), then US — matching the on-card country badge.
    // Array.sort is stable, so prior order is preserved within each group.
    const countryRank = (c: Contact): number => {
      const k = resolveCountry(c);
      return k === "CDN" ? 0 : k === null ? 1 : 2;
    };
    for (const s of Object.keys(map)) {
      map[s]?.sort((a, b) => countryRank(a) - countryRank(b));
    }
    return map;
  }, [visible]);

  const selected = useMemo(
    () => contacts.find((c) => c.id === selectedId) ?? null,
    [contacts, selectedId],
  );

  async function onDropToStage(stage: Stage | typeof ARCHIVE_STAGE, contactId: string) {
    setDragOverStage(null);
    const c = contacts.find((x) => x.id === contactId);
    if (!c) return;
    if (stageOf(c.outreach_status) === stage) return;
    await changeStatus(contactId, stage as Status);
  }

  return (
    <div className="space-y-4" data-testid="bi-outreach">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-lg">Outreach Pipeline</h3>

        <label className="text-sm text-white/70 ml-2">Segment</label>
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="bg-brand-surface border border-card rounded-md px-2 py-1 text-sm"
          aria-label="Segment filter"
        >
          <option value="">All</option>
          <option value="lender">Lenders</option>
          <option value="broker">Brokers</option>
        </select>

        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name / email / phone"
          className="bg-brand-surface border border-card rounded-md px-2 py-1 text-sm w-72"
          aria-label="Search contacts"
        />

        <button
          type="button"
          onClick={() => void load()}
          className="px-3 py-1 rounded-md text-sm bg-white/10 hover:bg-white/15"
        >
          Refresh
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="ml-auto px-3 py-1 rounded-md text-sm bg-white/10 hover:bg-white/15 disabled:opacity-50"
          aria-label="Import contacts from spreadsheet"
        >
          {importing ? "Importing…" : "Import"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={onPickFile}
          data-testid="bi-outreach-file-input"
          aria-hidden="true"
          tabIndex={-1}
        />

        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className="px-3 py-1 rounded-md text-sm bg-white/5 hover:bg-white/10"
          aria-expanded={profileOpen}
        >
          My profile
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm" data-testid="bi-outreach-selection-bar">
          <span className="font-semibold text-white">{selectedIds.size} selected</span>
          <button type="button" disabled={bulkBusy} onClick={() => void bulkAction("remove_from_outreach")} className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/15 disabled:opacity-50">Remove from outreach</button>
          <button type="button" disabled={bulkBusy} onClick={() => void bulkAction("delete_from_crm")} className="px-3 py-1 rounded-md bg-red-500/20 text-red-200 hover:bg-red-500/30 disabled:opacity-50">Delete from CRM</button>
          <button type="button" onClick={clearSelection} className="ml-auto px-3 py-1 rounded-md bg-white/5 hover:bg-white/10">Clear</button>
        </div>
      )}

      {(importResult || importError) && (
        <div
          className="bg-brand-surface border border-card rounded-xl p-3 text-sm"
          data-testid="bi-outreach-import-banner"
          role="status"
        >
          {importError && <p className="text-red-400">Import failed: {importError}</p>}
          {importResult && (
            <div className="space-y-1">
              <p>
                Imported <span className="text-white/90">{importResult.imported}</span>{" "}
                · updated <span className="text-white/90">{importResult.updated}</span>{" "}
                · suppressed <span className="text-white/90">{importResult.suppressed}</span>{" "}
                · skipped <span className="text-white/90">{importResult.skipped}</span>{" "}
                · total <span className="text-white/60">{importResult.total}</span>
              </p>
              {importResult.results && importResult.results.filter((r) => !r.ok).length > 0 && (
                <details className="text-xs text-white/60">
                  <summary>Show {importResult.results.filter((r) => !r.ok).length} skipped row(s)</summary>
                  <ul className="mt-1 space-y-0.5">
                    {importResult.results
                      .filter((r) => !r.ok)
                      .slice(0, 50)
                      .map((r, i) => (
                        <li key={i}>row {r.row}: {r.error}</li>
                      ))}
                  </ul>
                </details>
              )}
              <button
                type="button"
                onClick={() => setImportResult(null)}
                className="text-xs text-white/50 hover:text-white/80 underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {profileOpen && (
        <ProfilePanel
          profile={profile}
          saving={profileSaving}
          onSave={saveProfile}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {loading && <p className="text-sm text-white/60">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* BF_PORTAL_BLOCK_v698_OUTREACH_PANEL_v1 — selected contact actions at top, above the board */}
      {selected && (
        <ContactPanel
          contact={selected}
          onClose={() => setSelectedId(null)}
          onLog={(payload) => logActivity(selected.id, payload)}
          onStatusChange={(s) => changeStatus(selected.id, s)}
          bookingsUrl={profile?.bookings_url ?? null}
          onInvite={(msg) => sendDemoInvite(selected.id, msg)}
          sequences={sequences}
          onEnroll={(seqId) => enrollInSequence(selected.id, seqId)}
          onStartOnboarding={() => startOnboarding(selected.id)}
        />
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <BoardColumn
            key={stage}
            stage={stage}
            label={STAGE_LABELS[stage] ?? stage}
            cards={columns[stage] ?? []}
            selectedId={selectedId}
            onSelect={openContact}
            selected={selectedIds}
            onToggleSelect={toggleSelect}
            dragOver={dragOverStage === stage}
            onDragOverStage={() => setDragOverStage(stage)}
            onDragLeaveStage={() => setDragOverStage((s) => (s === stage ? null : s))}
            onDropCard={(id) => void onDropToStage(stage, id)}
          />
        ))}
        <BoardColumn
          stage={ARCHIVE_STAGE}
          label={STAGE_LABELS[ARCHIVE_STAGE] ?? ARCHIVE_STAGE}
          cards={columns[ARCHIVE_STAGE] ?? []}
          selectedId={selectedId}
          onSelect={openContact}
          selected={selectedIds}
          onToggleSelect={toggleSelect}
          dragOver={dragOverStage === ARCHIVE_STAGE}
          onDragOverStage={() => setDragOverStage(ARCHIVE_STAGE)}
          onDragLeaveStage={() => setDragOverStage((s) => (s === ARCHIVE_STAGE ? null : s))}
          onDropCard={(id) => void onDropToStage(ARCHIVE_STAGE, id)}
          muted
        />
      </div>

      {!loading && visible.length === 0 && (
        <p className="text-sm text-white/50">No contacts match these filters.</p>
      )}

      {contacts.length < total && (
        <div className="flex justify-center pt-2" data-testid="bi-outreach-load-more">
          <button type="button" disabled={loadingMore} onClick={() => void loadMore()} className="px-4 py-2 rounded-md text-sm bg-white/10 hover:bg-white/15 disabled:opacity-50">
            {loadingMore ? "Loading…" : `Load more (${total - contacts.length} more)`}
          </button>
        </div>
      )}

    </div>
  );
}

function BoardColumn(props: {
  stage: string;
  label: string;
  cards: Contact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  dragOver: boolean;
  onDragOverStage: () => void;
  onDragLeaveStage: () => void;
  onDropCard: (contactId: string) => void;
  selected: Set<string>; // BF_PORTAL_BLOCK_v800_OUTREACH_PAGER_AND_BULK
  onToggleSelect: (id: string) => void;
  muted?: boolean;
}) {
  const { label, cards, selectedId, onSelect, dragOver, onDragOverStage, onDropCard, onDragLeaveStage, selected, onToggleSelect, muted } = props; // BF_PORTAL_BLOCK_v698_OUTREACH_PANEL_v1 — inline selection restored
  return (
    <div
      className={`flex-shrink-0 w-64 rounded-xl border p-2 ${
        dragOver ? "border-white/40 bg-white/5" : "border-card bg-brand-surface"
      } ${muted ? "opacity-80" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverStage();
      }}
      onDragLeave={onDragLeaveStage}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropCard(id);
      }}
    >
      <div className="flex items-center justify-between px-1 py-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-white/40">{cards.length}</span>
      </div>
      <div className="space-y-2 min-h-[3rem]">
        {cards.map((c) => (
          <div
            key={c.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
            onClick={() => onSelect(c.id)}
            className={`cursor-pointer rounded-lg border p-2 text-sm bg-black/20 hover:bg-black/30 ${
              selectedId === c.id ? "border-white/50" : "border-card"
            }`}
            data-testid="bi-outreach-card"
          >
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => { e.stopPropagation(); onToggleSelect(c.id); }}
                className="mr-1 shrink-0"
                aria-label="Select contact"
              />
              <strong className="truncate max-w-[60%]">{c.full_name}</strong>
              {c.company_name && (
                <span className="truncate text-xs text-white/45 max-w-[40%]" title={c.company_name}>{/* BF_PORTAL_BLOCK_v749_OUTREACH_COMPANY */}{c.company_name}</span>
              )}
              {c.promoted_lender_id && (
                <span className="text-[10px] uppercase text-emerald-400/80" title="Onboarded as lender">
                  ✓ lender
                </span>
              )}
            </div>
            {c.title && <div className="text-xs text-white/50 truncate">{c.title}</div>}
            <div className="text-xs text-white/40 truncate">
              {c.email ?? c.phone_e164 ?? "—"}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              {c.outreach_segment ? (
                <span className="inline-block text-[10px] uppercase tracking-wide text-white/40">
                  {c.outreach_segment}
                </span>
              ) : (
                <span />
              )}
              {/* BF_PORTAL_BI_OUTREACH_COUNTRY_BADGE_v1 — contact country, bottom-right of card. */}
              {(() => {
                const country = resolveCountry(c);
                return country ? (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      country === "CDN" ? "bg-red-500/15 text-red-300" : "bg-blue-500/15 text-blue-300"
                    }`}
                    title={country === "CDN" ? "Canada" : "United States"}
                  >
                    {country}
                  </span>
                ) : null;
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactPanel(props: {
  contact: Contact;
  onClose: () => void;
  onLog: (payload: { event_type: EventType; outcome?: string; body?: string }) => Promise<void>;
  onStatusChange: (status: Status | "") => Promise<void>;
  bookingsUrl: string | null;
  onInvite: (customMessage?: string) => Promise<{ ok: boolean; error?: string }>;
  sequences: ReadonlyArray<{ id: string; name: string; is_active: boolean }>;
  onEnroll: (sequenceId: string) => Promise<{ ok: boolean; mock?: boolean; error?: string }>;
  onStartOnboarding: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const { contact: c, onClose, onLog, onStatusChange, bookingsUrl, onInvite, sequences, onEnroll, onStartOnboarding } = props;
  const [logging, setLogging] = useState(false);
  const [eventType, setEventType] = useState<EventType>("call");
  const [outcome, setOutcome] = useState<string>("");
  const [note, setNote] = useState("");
  const [onboarding, setOnboarding] = useState(false);
  const [onboardFeedback, setOnboardFeedback] = useState<string | null>(null);

  async function submit() {
    setLogging(true);
    try {
      const payload: { event_type: EventType; outcome?: string; body?: string } = {
        event_type: eventType,
      };
      if (outcome) payload.outcome = outcome;
      if (note.trim()) payload.body = note.trim();
      await onLog(payload);
      setOutcome("");
      setNote("");
    } finally {
      setLogging(false);
    }
  }

  async function onboard() {
    setOnboarding(true);
    setOnboardFeedback(null);
    try {
      const r = await onStartOnboarding();
      setOnboardFeedback(r.ok ? "Onboarding started — lender created & invited." : `Failed: ${r.error}`);
    } finally {
      setOnboarding(false);
    }
  }

  return (
    <div className="bg-brand-surface border border-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <strong>{c.full_name}</strong>
            {c.title && <span className="text-xs text-white/50">· {c.title}</span>}
            {c.promoted_lender_id && (
              <span className="text-[10px] uppercase text-emerald-400/80">✓ onboarded</span>
            )}
          </div>
          <div className="text-xs text-white/60">
            {c.email ?? "—"} · {c.phone_e164 ?? "—"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-white/60 hover:text-white"
          aria-label="Close contact panel"
        >
          ×
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-white/60">Stage</label>
        <select
          value={c.outreach_status ?? ""}
          onChange={(e) => void onStatusChange(e.target.value as Status | "")}
          className="bg-black/20 border border-card rounded-md px-2 py-1 text-xs"
          aria-label={`Status for ${c.full_name}`}
        >
          <option value="">unassigned</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{(STAGE_LABELS[s] ?? s).toString()}</option>
          ))}
        </select>

        <InviteButton
          disabled={!bookingsUrl || !c.phone_e164}
          disabledReason={
            !bookingsUrl
              ? "Set your MS Bookings URL in My profile first"
              : !c.phone_e164
                ? "Contact has no phone number"
                : ""
          }
          onSend={(msg) => onInvite(msg)}
        />
        <EnrollButton
          disabled={!c.email || sequences.length === 0}
          disabledReason={
            !c.email
              ? "Contact has no email"
              : sequences.length === 0
                ? "No active Apollo sequences. Visit Marketing → Sync from Apollo."
                : ""
          }
          sequences={sequences}
          onEnroll={onEnroll}
        />

        <button
          type="button"
          disabled={onboarding || Boolean(c.promoted_lender_id)}
          title={c.promoted_lender_id ? "Already onboarded as a lender" : ""}
          onClick={() => void onboard()}
          className="px-2 py-1 rounded-md text-xs bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {onboarding ? "Onboarding…" : c.promoted_lender_id ? "Onboarded" : "Start onboarding"}
        </button>
        {onboardFeedback && (
          <span className="text-xs text-white/60" role="status">{onboardFeedback}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value as EventType)}
          className="bg-black/20 border border-card rounded-md px-2 py-1 text-xs"
          aria-label="Event type"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {eventType === "call" && (
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="bg-black/20 border border-card rounded-md px-2 py-1 text-xs"
            aria-label="Call outcome"
          >
            <option value="">— outcome —</option>
            {CALL_OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Free-text note"
          className="bg-black/20 border border-card rounded-md px-2 py-1 text-xs flex-1 min-w-[12rem]"
          aria-label="Note"
        />

        <button
          type="button"
          disabled={logging}
          onClick={() => void submit()}
          className="px-3 py-1 rounded-md text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50"
        >
          {logging ? "Logging…" : "Log activity"}
        </button>
      </div>

      <ActivityTimeline contactId={c.id} />
    </div>
  );
}

function EnrollButton(props: {
  disabled: boolean;
  disabledReason: string;
  sequences: ReadonlyArray<{ id: string; name: string; is_active: boolean }>;
  onEnroll: (sequenceId: string) => Promise<{ ok: boolean; mock?: boolean; error?: string }>;
}) {
  const { disabled, disabledReason, sequences, onEnroll } = props;
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [picked, setPicked] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function submit() {
    if (!picked) return;
    setSending(true);
    setFeedback(null);
    try {
      const r = await onEnroll(picked);
      if (r.ok) {
        setFeedback(r.mock ? "Enrolled (mock)" : "Enrolled");
        setOpen(false);
        setPicked("");
      } else {
        setFeedback(`Failed: ${r.error ?? "enroll_failed"}`);
      }
    } finally {
      setSending(false);
    }
  }

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        title={disabledReason}
        className="px-2 py-1 rounded-md text-xs bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Enroll in sequence
      </button>
    );
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        {feedback && <span className="text-xs text-white/60" role="status">{feedback}</span>}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-2 py-1 rounded-md text-xs bg-white/10 hover:bg-white/15"
        >
          Enroll in sequence
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {feedback && <span className="text-xs text-white/60" role="status">{feedback}</span>}
      <select
        value={picked}
        onChange={(e) => setPicked(e.target.value)}
        className="bg-black/20 border border-card rounded-md px-2 py-1 text-xs"
        aria-label="Sequence"
      >
        <option value="">— pick a sequence —</option>
        {sequences.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={sending || !picked}
        onClick={() => void submit()}
        className="px-2 py-1 rounded-md text-xs bg-white/15 hover:bg-white/20 disabled:opacity-50"
      >
        {sending ? "Enrolling…" : "Enroll"}
      </button>
      <button
        type="button"
        disabled={sending}
        onClick={() => {
          setOpen(false);
          setPicked("");
          setFeedback(null);
        }}
        className="px-2 py-1 rounded-md text-xs text-white/60 hover:text-white"
      >
        Cancel
      </button>
    </div>
  );
}

function ActivityTimeline({ contactId }: { contactId: string }) {
  const [events, setEvents] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r: any = await api(`/api/v1/bi/crm/outreach/contacts/${contactId}/activity`);
        if (cancelled) return;
        setEvents(Array.isArray(r?.events) ? r.events : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (loading) return <p className="text-xs text-white/50">Loading timeline…</p>;
  if (events.length === 0) return <p className="text-xs text-white/40">No activity logged yet.</p>;
  return (
    <ul className="space-y-1">
      {events.map((e) => (
        <li key={e.id} className="text-xs text-white/70 border-l border-white/10 pl-2">
          <span className="text-white/40">{new Date(e.created_at).toLocaleString()} · </span>
          <span className="uppercase text-white/50">{e.event_type}</span>
          {e.outcome && <span className="text-white/60"> · {e.outcome}</span>}
          {e.actor_name && <span className="text-white/40"> · {e.actor_name}</span>}
          {e.body && <span className="text-white/80"> — {e.body}</span>}
        </li>
      ))}
    </ul>
  );
}

function InviteButton(props: {
  disabled: boolean;
  disabledReason: string;
  onSend: (customMessage?: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const { disabled, disabledReason, onSend } = props;
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [custom, setCustom] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function send(useCustom: boolean) {
    setSending(true);
    setFeedback(null);
    try {
      const r = await onSend(useCustom ? custom.trim() || undefined : undefined);
      if (r.ok) {
        setFeedback("Sent.");
        setOpen(false);
        setCustom("");
      } else {
        setFeedback(`Failed: ${r.error ?? "send_failed"}`);
      }
    } finally {
      setSending(false);
    }
  }

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        title={disabledReason}
        className="px-2 py-1 rounded-md text-xs bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send demo invite
      </button>
    );
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        {feedback && <span className="text-xs text-white/60" role="status">{feedback}</span>}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-2 py-1 rounded-md text-xs bg-white/10 hover:bg-white/15"
        >
          Send demo invite
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        placeholder="Optional custom message (leave blank for default)"
        className="bg-black/20 border border-card rounded-md px-2 py-1 text-xs w-72"
        aria-label="Custom invite message"
      />
      <button
        type="button"
        disabled={sending}
        onClick={() => void send(true)}
        className="px-2 py-1 rounded-md text-xs bg-white/15 hover:bg-white/20 disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send"}
      </button>
      <button
        type="button"
        disabled={sending}
        onClick={() => {
          setOpen(false);
          setCustom("");
          setFeedback(null);
        }}
        className="px-2 py-1 rounded-md text-xs text-white/60 hover:text-white"
      >
        Cancel
      </button>
    </div>
  );
}

function ProfilePanel(props: {
  profile: StaffProfile | null;
  saving: boolean;
  onSave: (next: { display_name?: string; bookings_url?: string; phone_e164?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const { profile, saving, onSave, onClose } = props;
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bookingsUrl, setBookingsUrl] = useState(profile?.bookings_url ?? "");
  const [phone, setPhone] = useState(profile?.phone_e164 ?? "");

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setBookingsUrl(profile?.bookings_url ?? "");
    setPhone(profile?.phone_e164 ?? "");
  }, [profile]);

  return (
    <div className="bg-brand-surface border border-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">My outreach profile</h4>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-white/60 hover:text-white"
          aria-label="Close profile panel"
        >
          ×
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full bg-black/20 border border-card rounded-md px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm">
          Phone (E.164)
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1403…"
            className="mt-1 w-full bg-black/20 border border-card rounded-md px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          MS Bookings URL (must be https://)
          <input
            value={bookingsUrl}
            onChange={(e) => setBookingsUrl(e.target.value)}
            placeholder="https://outlook.office.com/bookings/…"
            className="mt-1 w-full bg-black/20 border border-card rounded-md px-2 py-1 text-sm"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void onSave({
              display_name: displayName,
              bookings_url: bookingsUrl,
              phone_e164: phone,
            })
          }
          className="px-3 py-1 rounded-md text-sm bg-white/10 hover:bg-white/15 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
