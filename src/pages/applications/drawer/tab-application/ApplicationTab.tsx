// BF_PORTAL_BLOCK_v123b_CALL_CLIENT_AND_APP_TAB_v1
//
// Generic "show every field" Application tab. Replaces the previous
// hand-curated 23-field rendering, which dropped roughly 60% of the
// data the wizard collects (Step 1 deep questions, partner data, Step 6
// signature data, equipment fields). Per locked ruling: "the first tab
// of the card should show all data provided".

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fetchPortalApplication } from "@/api/applications";
import type { PortalApplicationRecord } from "@/types/application.types";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { getErrorMessage } from "@/utils/errors";

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function humanizeKey(key: string): string {
  if (!key) return "";
  const spaced = key
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return spaced
    .split(/\s+/)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime())) {
        return /T/.test(trimmed) ? d.toLocaleString() : d.toLocaleDateString();
      }
    }
    if (/amount|revenue|balance|funding|asset|cash|deposit/i.test(key)) {
      const cleaned = trimmed.replace(/[^\d.\-]/g, "");
      const n = Number(cleaned);
      if (Number.isFinite(n) && cleaned.length > 0) {
        return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      }
    }
    return trimmed;
  }
  if (typeof value === "number") {
    if (/amount|revenue|balance|funding|asset|cash|deposit/i.test(key)) {
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return value.join(", ");
    }
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    return keys.length ? `${keys.length} field${keys.length === 1 ? "" : "s"}` : "—";
  }
  return String(value);
}

type Row = { key: string; label: string; value: string };

function flattenSection(source: unknown): Row[] {
  if (!isPlainObject(source)) return [];
  const rows: Row[] = [];
  for (const [k, v] of Object.entries(source)) {
    if (isPlainObject(v)) {
      const childKeys = Object.keys(v);
      if (childKeys.length === 0) {
        rows.push({ key: k, label: humanizeKey(k), value: "—" });
        continue;
      }
      const allLeaves = childKeys.every((ck) => !isPlainObject((v as any)[ck]));
      if (!allLeaves) {
        rows.push({ key: k, label: humanizeKey(k), value: formatValue(k, v) });
        continue;
      }
      for (const ck of childKeys) {
        rows.push({
          key: `${k}.${ck}`,
          label: `${humanizeKey(k)} · ${humanizeKey(ck)}`,
          value: formatValue(ck, (v as any)[ck]),
        });
      }
    } else {
      rows.push({ key: k, label: humanizeKey(k), value: formatValue(k, v) });
    }
  }
  return rows;
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="drawer-section">
      <div className="drawer-section__title">{title}</div>
      <div className="drawer-section__body">
        <dl className="drawer-kv-list">
          {rows.map((r) => (
            <div key={r.key} className="drawer-kv-list__item">
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function ApplicationTab(): ReactNode {
  const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
  const { data, isLoading, error } = useQuery<PortalApplicationRecord>({
    queryKey: ["portal-application", applicationId],
    queryFn: ({ signal }) => fetchPortalApplication<PortalApplicationRecord>(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId),
    retry: false,
  });

  const sections = useMemo(() => {
    if (!data || typeof data !== "object") return null;
    const d = data as Record<string, any>;
    const flat = (isPlainObject(d.application) && !d.kyc && !d.businessDetails)
      ? (d.application as Record<string, any>)
      : d;
    const businessSrc = flat.businessDetails ?? flat.business ?? null;
    const applicantSrc = flat.applicantDetails ?? flat.applicantInfo ?? flat.applicant ?? null;
    const kycSrc = flat.kyc ?? flat.financialProfile ?? null;
    const overviewSrc = flat.overview ?? flat.fundingRequest ?? null;
    const owners = Array.isArray(flat.owners) ? flat.owners : [];
    return {
      overview: flattenSection(overviewSrc),
      business: flattenSection(businessSrc),
      applicant: flattenSection(applicantSrc),
      kyc: flattenSection(kycSrc),
      owners: owners.map((o, i) => ({
        title: `Partner / Co-Applicant ${i + 1}`,
        rows: flattenSection(o),
      })),
      meta: flattenSection({
        id: flat.id,
        status: flat.status,
        stage: flat.stage,
        submittedAt: flat.submittedAt,
        productCategory: flat.productCategory,
        source: flat.source,
      }),
    };
  }, [data]);

  if (!applicationId) return <div className="drawer-placeholder">Select an application to view details.</div>;
  if (isLoading) return <div className="drawer-placeholder">Loading application data…</div>;
  if (error) return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load application data.")}</div>;
  if (!data || !sections) return <div className="drawer-placeholder">No application data</div>;

  return (
    <div className="drawer-tab drawer-tab__application" data-testid="application-tab-v123">
      <Section title="Overview" rows={sections.overview} />
      <Section title="Business" rows={sections.business} />
      <Section title="Applicant" rows={sections.applicant} />
      {sections.owners.map((o, i) => (
        <Section key={`owner-${i}`} title={o.title} rows={o.rows} />
      ))}
      <Section title="Financial Profile / KYC" rows={sections.kyc} />
      <Section title="Application Metadata" rows={sections.meta} />
    </div>
  );
}

export default ApplicationTab;
