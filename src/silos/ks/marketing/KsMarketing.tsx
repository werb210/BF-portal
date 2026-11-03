// BF_PORTAL_v865_KS_MARKETING - Keystone silo > Marketing: email marketing to prospective licensees (KS-Ops). Tabs:
// Overview (sender set-up and compliance warnings), Prospects, Templates, Campaigns, Sequences, Suppression list.
// Keystone branding only; the CASL / CAN-SPAM footer and unsubscribe link are added by KS-Ops to every email.
import { useState, type CSSProperties, type ReactNode } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { KS_ACCENT } from "../ksAccess";
import { Button, ErrorBox, input, KeyValues, Loading, PageTitle, Section } from "../ksUi";
import { KS_PLAN_INTEREST, KS_PROSPECT_SOURCES, KS_PROSPECT_STATUSES, mktApi, SOURCE_LABELS, STATUS_LABELS, type SegmentFilters } from "./ksMarketingApi";
import KsMktProspects, { KsMktProspectDetail } from "./KsMktProspects";
import KsMktTemplates from "./KsMktTemplates";
import KsMktCampaigns, { KsMktCampaignDetail } from "./KsMktCampaigns";
import KsMktSequences, { KsMktSequenceDetail } from "./KsMktSequences";
import KsMktSuppressions from "./KsMktSuppressions";
import { TechnicalDetails, settingNamesIn, settingNamesToWords } from "@/components/SetupNotice";

export const KS_MKT_BASE = "/silo/ks/marketing";

const TABS: Array<[string, string]> = [
  ["overview", "Overview"],
  ["prospects", "Prospects"],
  ["templates", "Templates"],
  ["campaigns", "Campaigns"],
  ["sequences", "Sequences"],
  ["suppressions", "Suppression list"],
];

const tab = (active: boolean): CSSProperties => ({
  padding: "8px 14px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  background: active ? KS_ACCENT : "transparent", // white on KS_ACCENT: 7.1:1
  color: active ? "#ffffff" : "var(--ui-text)",
  border: active ? "1px solid transparent" : "1px solid var(--ui-border)",
});

/** The sender warnings, shown on every Marketing tab until they are fixed. */
export function SenderWarnings({ compact = false }: { compact?: boolean }) {
  const status = useQuery({ queryKey: ["ks", "mkt", "status"], queryFn: () => mktApi.status(), staleTime: 60_000 });
  const w = status.data?.warnings ?? [];
  if (!w.length) return null;
  const blocking = status.data && !status.data.can_send;
  return (
    <div
      role="alert"
      data-testid="ks-mkt-warnings"
      style={{
        border: `1px solid ${blocking ? "#b91c1c" : "#b45309"}`,
        background: "var(--ui-surface-strong)",
        color: "var(--ui-text)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        {blocking ? "Marketing email cannot be sent yet" : "Marketing email set-up is not finished"}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>
        {(compact ? w.slice(0, 2) : w).map((x) => (
          <li key={x}>{settingNamesToWords(x)}</li>
        ))}
        {compact && w.length > 2 ? <li>... and {w.length - 2} more on the Overview tab.</li> : null}
      </ul>
      {compact ? null : <TechnicalDetails names={w.flatMap((x) => settingNamesIn(x)).filter((n, i, all) => all.indexOf(n) === i)} />}
    </div>
  );
}

function Overview() {
  const [refresh, setRefresh] = useState(0);
  const status = useQuery({ queryKey: ["ks", "mkt", "status", refresh], queryFn: () => mktApi.status(refresh > 0) });
  if (status.isLoading) return <Loading what="the marketing set-up" />;
  if (status.error) return <ErrorBox error={status.error} />;
  const s = status.data!;
  const yes = (v: boolean | null, unknown = "Could not check") => (v === null ? unknown : v ? "Yes" : "No");
  return (
    <>
      <SenderWarnings />
      <Section title="Sender" actions={<Button onClick={() => setRefresh((n) => n + 1)}>Check again</Button>}>
        <KeyValues
          rows={[
            ["Can send", s.can_send ? "Yes" : `No - ${settingNamesToWords(s.sending_problem ?? "")}`],
            ["From", `${s.sender.from_name} <${s.sender.from || "not set"}>${s.sender.from_configured ? "" : " (the Keystone sender address is not set yet)"}`],
            ["Domain authenticated in SendGrid", `${s.domain.domain || "-"}: ${yes(s.domain.authenticated)}${s.domain.error ? ` (${s.domain.error})` : ""}`],
            ["Replies go to", s.sender.reply_to],
            ["Sender shown in the footer", `${s.sender.business_name} (${s.sender.legal_name})`],
            ["Mailing address in the footer", `${s.sender.address}${s.sender.address_is_default ? " (the default - Keystone's own address is not set yet)" : ""}`],
            ["Open / click / bounce tracking", s.tracking_configured ? "On" : "Off - set up the SendGrid Event Webhook"],
            ["Reply detection", s.reply_detection.mailbox ? `Checks ${s.reply_detection.mailbox}` : "Off - use Mark replied on the prospect"],
          ]}
        />
      </Section>
      <Section title="How consent works">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
          <li>Nobody is emailed without valid consent. Prospects without it are listed as blocked, with the reason.</li>
          <li>Express consent lasts until they unsubscribe. Implied consent from an inquiry lasts 6 months; from a subscription, 2 years after it ends.</li>
          <li>US business contacts can be emailed under CAN-SPAM until they opt out (record them as "US business contact").</li>
          <li>Unsubscribes, hard bounces and spam reports go on the suppression list and are never emailed again.</li>
          <li>Every email carries the sender, the mailing address and a one-click unsubscribe link. Sequences stop when the prospect replies, signs up or books a demo.</li>
        </ul>
      </Section>
    </>
  );
}

const toggle = (list: string[] | undefined, v: string) => {
  const cur = list ?? [];
  return cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
};

function Chips({ title, options, labels, value, onChange }: { title: string; options: readonly string[]; labels?: Record<string, string>; value?: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
      <legend style={{ fontSize: 13, fontWeight: 600, color: "var(--ui-text-muted)", marginBottom: 4 }}>{title}</legend>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map((o) => {
          const on = (value ?? []).includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(toggle(value, o))}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: on ? KS_ACCENT : "transparent",
                color: on ? "#ffffff" : "var(--ui-text)",
                border: on ? "1px solid transparent" : "1px solid var(--ui-border)",
              }}
            >
              {labels?.[o] ?? o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Segment filters: status, source, plan interest, country, province/state and a search. */
export function SegmentFilterEditor({ value, onChange, extra }: { value: SegmentFilters; onChange: (v: SegmentFilters) => void; extra?: ReactNode }) {
  const set = (k: keyof SegmentFilters) => (v: string[]) => onChange({ ...value, [k]: v.length ? v : undefined });
  const regions = (value.regions ?? []).join(", ");
  return (
    <div style={{ display: "grid", gap: 12 }} data-testid="ks-mkt-filters">
      <Chips title="Status" options={KS_PROSPECT_STATUSES} labels={STATUS_LABELS} value={value.statuses} onChange={set("statuses")} />
      <Chips title="Source" options={KS_PROSPECT_SOURCES} labels={SOURCE_LABELS} value={value.sources} onChange={set("sources")} />
      <Chips title="Plan interest" options={KS_PLAN_INTEREST} labels={{ starter: "Starter", growth: "Growth", pro: "Pro" }} value={value.plans} onChange={set("plans")} />
      <Chips title="Country" options={["CA", "US"]} labels={{ CA: "Canada", US: "United States" }} value={value.countries} onChange={set("countries")} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600, color: "var(--ui-text-muted)" }}>
          Province / state (codes, comma-separated)
          <input
            style={{ ...input, width: 220 }}
            value={regions}
            placeholder="AB, BC, WA"
            onChange={(e) => {
              const list = e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
              onChange({ ...value, regions: list.length ? list : undefined });
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600, color: "var(--ui-text-muted)" }}>
          Search
          <input style={{ ...input, width: 220 }} value={value.q ?? ""} placeholder="Name, email or company" onChange={(e) => onChange({ ...value, q: e.target.value || undefined })} />
        </label>
        {extra}
      </div>
    </div>
  );
}

export default function KsMarketing() {
  return (
    <div data-testid="ks-marketing">
      <PageTitle>Keystone marketing</PageTitle>
      <nav aria-label="Marketing" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {TABS.map(([path, name]) => (
          <NavLink key={path} to={`${KS_MKT_BASE}/${path}`} style={({ isActive }) => tab(isActive)}>
            {name}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="prospects" element={<KsMktProspects />} />
        <Route path="prospects/:id" element={<KsMktProspectDetail />} />
        <Route path="templates" element={<KsMktTemplates />} />
        <Route path="campaigns" element={<KsMktCampaigns />} />
        <Route path="campaigns/:id" element={<KsMktCampaignDetail />} />
        <Route path="sequences" element={<KsMktSequences />} />
        <Route path="sequences/:id" element={<KsMktSequenceDetail />} />
        <Route path="suppressions" element={<KsMktSuppressions />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>
    </div>
  );
}
