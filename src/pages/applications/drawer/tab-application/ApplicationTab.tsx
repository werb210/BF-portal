import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChangeEvent, ReactNode } from "react";
import { fetchPortalApplication, updatePortalApplication } from "@/api/applications";
import type { ApplicationAuditEvent, PortalApplicationRecord } from "@/types/application.types";
import type { CreditReadinessData } from "@/types/application";
import Input from "@/components/ui/Input";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { getErrorMessage } from "@/utils/errors";
import { getAuditEventLabel } from "@/components/Timeline/auditEventLabels";

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="drawer-section">
    <div className="drawer-section__title">{title}</div>
    <div className="drawer-section__body">{children}</div>
  </div>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="drawer-kv-list__item">
    <dt>{label}</dt>
    <dd>{value || "-"}</dd>
  </div>
);

const Divider = () => <hr className="my-3 border-slate-200" />;

type ApplicationFormState = {
  businessLegalName: string;
  businessOperatingName: string;
  businessAddress: string;
  businessStructure: string;
  businessIndustry: string;
  businessWebsiteUrl: string;
  operationsStartDate: string;
  operationsYearsInBusiness: string;
  operationsProductCategory: string;
  operationsUseOfFunds: string;
  operationsRequestedAmount: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  source: string;
  prequalAnnualRevenue: string;
  prequalMonthlyRevenue: string;
  prequalCreditRange: string;
};

const EMPTY_FORM_STATE: ApplicationFormState = {
  businessLegalName: "",
  businessOperatingName: "",
  businessAddress: "",
  businessStructure: "",
  businessIndustry: "",
  businessWebsiteUrl: "",
  operationsStartDate: "",
  operationsYearsInBusiness: "",
  operationsProductCategory: "",
  operationsUseOfFunds: "",
  operationsRequestedAmount: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  source: "",
  prequalAnnualRevenue: "",
  prequalMonthlyRevenue: "",
  prequalCreditRange: ""
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const pickRecord = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (isRecord(value)) return value;
  }
  return null;
};

const readValue = (records: Array<Record<string, unknown> | null>, keys: string[]) => {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      if (key in record) {
        const value = record[key];
        if (typeof value === "string") return value;
        if (typeof value === "number" || typeof value === "boolean") return String(value);
      }
    }
  }
  return "";
};

const normalizeFormState = (data: PortalApplicationRecord | null | undefined): ApplicationFormState => {
  if (!data || !isRecord(data)) return { ...EMPTY_FORM_STATE };
  const businessRecord =
    pickRecord(data, ["business", "businessDetails", "business_details", "businessInfo", "business_info"]) ?? null;
  const operationsRecord =
    pickRecord(data, ["operations", "operationsDetails", "operations_details", "operationsInfo", "operations_info"]) ??
    null;
  const contactRecord =
    pickRecord(data, ["primaryContact", "primary_contact", "contactInfo", "contact_info", "applicantInfo"]) ?? null;

  return {
    businessLegalName: readValue(
      [businessRecord, data],
      ["legalName", "legal_name", "businessLegalName", "business_legal_name", "businessName", "business_name"]
    ),
    businessOperatingName: readValue(
      [businessRecord, data],
      ["operatingName", "operating_name", "businessOperatingName", "business_operating_name"]
    ),
    businessAddress: readValue(
      [businessRecord, data],
      ["address", "businessAddress", "business_address", "location", "businessLocation"]
    ),
    businessStructure: readValue(
      [businessRecord, data],
      ["structure", "businessStructure", "business_structure", "entityType", "entity_type"]
    ),
    businessIndustry: readValue([businessRecord, data], ["industry", "industryType", "industry_type"]),
    businessWebsiteUrl: readValue(
      [businessRecord, data],
      ["websiteUrl", "website_url", "website", "url", "businessWebsite"]
    ),
    operationsStartDate: readValue(
      [operationsRecord, data],
      ["startDate", "start_date", "businessStartDate", "business_start_date"]
    ),
    operationsYearsInBusiness: readValue(
      [operationsRecord, data],
      ["yearsInBusiness", "years_in_business", "businessYears", "business_years"]
    ),
    operationsProductCategory: readValue(
      [operationsRecord, data],
      ["productCategory", "product_category", "category"]
    ),
    operationsUseOfFunds: readValue(
      [operationsRecord, data],
      ["useOfFunds", "use_of_funds", "fundsUse", "funds_use"]
    ),
    operationsRequestedAmount: readValue(
      [operationsRecord, data],
      ["requestedAmount", "requested_amount", "amountRequested", "amount_requested"]
    ),
    primaryContactName: readValue([contactRecord, data], ["name", "contactName", "contact_name"]),
    primaryContactEmail: readValue([contactRecord, data], ["email", "contactEmail", "contact_email"]),
    primaryContactPhone: readValue([contactRecord, data], ["phone", "contactPhone", "contact_phone"]),
    source: readValue([data], ["source", "leadSource", "lead_source"]),
    prequalAnnualRevenue: readValue(
      [operationsRecord, data],
      ["annualRevenue", "annual_revenue", "yearlyRevenue", "yearly_revenue"]
    ),
    prequalMonthlyRevenue: readValue([operationsRecord, data], ["monthlyRevenue", "monthly_revenue"]),
    prequalCreditRange: readValue([operationsRecord, data], ["creditRange", "credit_range"])
  };
};

const normalizeCreditReadinessData = (data: PortalApplicationRecord | null | undefined): CreditReadinessData => {
  if (!data || !isRecord(data)) {
    return {
      industry: "",
      yearsInBusiness: "",
      annualRevenue: "",
      monthlyRevenue: "",
      arBalance: "",
      availableCollateral: "",
      companyName: "",
      fullName: "",
      email: "",
      phone: ""
    };
  }

  const businessRecord =
    pickRecord(data, ["business", "businessDetails", "business_details", "businessInfo", "business_info"]) ?? null;
  const operationsRecord =
    pickRecord(data, ["operations", "operationsDetails", "operations_details", "operationsInfo", "operations_info"]) ??
    null;
  const contactRecord =
    pickRecord(data, ["primaryContact", "primary_contact", "contactInfo", "contact_info", "applicantInfo"]) ?? null;

  return {
    industry: readValue([businessRecord, operationsRecord, data], ["industry", "industryType", "industry_type"]),
    yearsInBusiness: readValue([operationsRecord, data], ["yearsInBusiness", "years_in_business", "businessYears"]),
    annualRevenue: readValue([operationsRecord, data], ["annualRevenue", "annual_revenue", "yearlyRevenue"]),
    monthlyRevenue: readValue([operationsRecord, data], ["monthlyRevenue", "monthly_revenue"]),
    arBalance: readValue([operationsRecord, data], ["arBalance", "accountsReceivable", "accounts_receivable", "ar"]),
    availableCollateral: readValue([operationsRecord, data], ["availableCollateral", "available_collateral"]),
    companyName: readValue([businessRecord, data], ["legalName", "businessName", "companyName", "name"]),
    fullName: readValue([contactRecord, data], ["name", "fullName", "contactName"]),
    email: readValue([contactRecord, data], ["email", "contactEmail", "contact_email"]),
    phone: readValue([contactRecord, data], ["phone", "contactPhone", "contact_phone"])
  };
};

const normalizeAuditEvents = (data: PortalApplicationRecord | null | undefined): ApplicationAuditEvent[] => {
  if (!data || !isRecord(data)) return [];
  const audit = data.auditTimeline ?? data.audit_events;
  if (!Array.isArray(audit)) return [];
  return audit.filter((event): event is ApplicationAuditEvent => Boolean(event) && typeof event === "object");
};

const parseNumberIfPossible = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const numberValue = Number(trimmed);
  if (Number.isFinite(numberValue)) return numberValue;
  return value;
};

const buildPatchPayload = (current: ApplicationFormState, baseline: ApplicationFormState) => {
  const updates: Record<string, Record<string, unknown>> = {};
  const setField = (section: string, key: string, value: unknown) => {
    updates[section] = { ...(updates[section] ?? {}), [key]: value };
  };

  if (current.businessLegalName !== baseline.businessLegalName) {
    setField("business", "legalName", current.businessLegalName);
  }
  if (current.businessOperatingName !== baseline.businessOperatingName) {
    setField("business", "operatingName", current.businessOperatingName);
  }
  if (current.businessAddress !== baseline.businessAddress) {
    setField("business", "address", current.businessAddress);
  }
  if (current.businessStructure !== baseline.businessStructure) {
    setField("business", "structure", current.businessStructure);
  }
  if (current.businessIndustry !== baseline.businessIndustry) {
    setField("business", "industry", current.businessIndustry);
  }
  if (current.businessWebsiteUrl !== baseline.businessWebsiteUrl) {
    setField("business", "websiteUrl", current.businessWebsiteUrl);
  }
  if (current.operationsStartDate !== baseline.operationsStartDate) {
    setField("operations", "startDate", current.operationsStartDate);
  }
  if (current.operationsYearsInBusiness !== baseline.operationsYearsInBusiness) {
    setField("operations", "yearsInBusiness", parseNumberIfPossible(current.operationsYearsInBusiness));
  }
  if (current.operationsProductCategory !== baseline.operationsProductCategory) {
    setField("operations", "productCategory", current.operationsProductCategory);
  }
  if (current.operationsUseOfFunds !== baseline.operationsUseOfFunds) {
    setField("operations", "useOfFunds", current.operationsUseOfFunds);
  }
  if (current.operationsRequestedAmount !== baseline.operationsRequestedAmount) {
    setField("operations", "requestedAmount", parseNumberIfPossible(current.operationsRequestedAmount));
  }
  if (current.primaryContactName !== baseline.primaryContactName) {
    setField("primaryContact", "name", current.primaryContactName);
  }
  if (current.primaryContactEmail !== baseline.primaryContactEmail) {
    setField("primaryContact", "email", current.primaryContactEmail);
  }
  if (current.primaryContactPhone !== baseline.primaryContactPhone) {
    setField("primaryContact", "phone", current.primaryContactPhone);
  }

  return updates;
};

const ApplicationTab = () => {
  const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<ApplicationFormState>({ ...EMPTY_FORM_STATE });
  const [baselineState, setBaselineState] = useState<ApplicationFormState>({ ...EMPTY_FORM_STATE });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const { data: application, isLoading, error } = useQuery<PortalApplicationRecord>({
    queryKey: ["portal-application", applicationId],
    queryFn: ({ signal }) => fetchPortalApplication(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId),
    retry: false
  });

  const auditEvents = useMemo(() => normalizeAuditEvents(application), [application]);
  const readinessData = useMemo(() => normalizeCreditReadinessData(application), [application]);

  useEffect(() => {
    const normalized = normalizeFormState(application);
    setFormState(normalized);
    setBaselineState(normalized);
  }, [application]);

  const hasChanges = useMemo(
    () =>
      Object.keys(formState).some(
        (key) => formState[key as keyof ApplicationFormState] !== baselineState[key as keyof ApplicationFormState]
      ),
    [baselineState, formState]
  );

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, Record<string, unknown>>) => {
      if (!applicationId) throw new Error("Missing application id.");
      return updatePortalApplication(applicationId, updates);
    },
    onSuccess: async () => {
      setFeedback({ type: "success", message: "Changes saved." });
      if (applicationId) {
        await queryClient.invalidateQueries({ queryKey: ["portal-application", applicationId] });
      }
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    },
    onError: (mutationError) => {
      setFeedback({ type: "error", message: getErrorMessage(mutationError, "Unable to save changes.") });
    }
  });

  if (!applicationId) return <div className="drawer-placeholder">Select an application to view details.</div>;
  if (isLoading) return <div className="drawer-placeholder">Loading application data…</div>;
  if (error) return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load application data.")}</div>;
  if (!application) return <div className="drawer-placeholder">No application data</div>;

  const handleFieldChange = (key: keyof ApplicationFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSave = async () => {
    const updates = buildPatchPayload(formState, baselineState);
    if (Object.keys(updates).length === 0) return;
    setFeedback(null);
    mutation.mutate(updates);
  };

  return (
    <div className="drawer-tab drawer-tab__application">
      {feedback ? (
        <div className={`documents-feedback documents-feedback--${feedback.type}`} role="status">
          {feedback.message}
        </div>
      ) : null}
      <Section title="Structured Data">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Industry" value={readinessData.industry} />
          <Field label="Years in Business" value={readinessData.yearsInBusiness} />
          <Field label="Annual Revenue" value={readinessData.annualRevenue} />
          <Field label="Monthly Revenue" value={readinessData.monthlyRevenue} />
          <Field label="Accounts Receivable" value={readinessData.arBalance} />
          <Field label="Available Collateral" value={readinessData.availableCollateral || "Not Provided"} />
        </div>

        <Divider />

        <dl className="drawer-kv-list">
          <Field label="Company Name" value={readinessData.companyName} />
          <Field label="Full Name" value={readinessData.fullName} />
          <Field label="Email" value={readinessData.email} />
          <Field label="Phone" value={readinessData.phone} />
        </dl>
      </Section>
      <Section title="Business">
        <Input label="Legal name" value={formState.businessLegalName} onChange={handleFieldChange("businessLegalName")} />
        <Input
          label="Operating name"
          value={formState.businessOperatingName}
          onChange={handleFieldChange("businessOperatingName")}
        />
        <Input
          label="Business address"
          value={formState.businessAddress}
          onChange={handleFieldChange("businessAddress")}
        />
        <Input
          label="Business structure"
          value={formState.businessStructure}
          onChange={handleFieldChange("businessStructure")}
        />
        <Input label="Industry" value={formState.businessIndustry} onChange={handleFieldChange("businessIndustry")} />
        <Input
          label="Website URL"
          value={formState.businessWebsiteUrl}
          onChange={handleFieldChange("businessWebsiteUrl")}
        />
      </Section>
      {formState.source === "website" ? (
        <Section title="Website Pre-Application Data">
          <div>Years in Business: {formState.operationsYearsInBusiness || "—"}</div>
          <div>Annual Revenue: {formState.prequalAnnualRevenue || "—"}</div>
          <div>Monthly Revenue: {formState.prequalMonthlyRevenue || "—"}</div>
          <div>Requested Amount: {formState.operationsRequestedAmount || "—"}</div>
          <div>Credit Range: {formState.prequalCreditRange || "—"}</div>
        </Section>
      ) : null}
      <Section title="Operations">
        <Input
          label="Start date"
          type="date"
          value={formState.operationsStartDate}
          onChange={handleFieldChange("operationsStartDate")}
        />
        <Input
          label="Years in business"
          type="number"
          value={formState.operationsYearsInBusiness}
          onChange={handleFieldChange("operationsYearsInBusiness")}
        />
        <Input
          label="Product category"
          value={formState.operationsProductCategory}
          onChange={handleFieldChange("operationsProductCategory")}
        />
        <Input
          label="Use of funds"
          value={formState.operationsUseOfFunds}
          onChange={handleFieldChange("operationsUseOfFunds")}
        />
        <Input
          label="Requested amount"
          type="number"
          value={formState.operationsRequestedAmount}
          onChange={handleFieldChange("operationsRequestedAmount")}
        />
      </Section>
      <Section title="Primary Contact">
        <Input
          label="Contact name"
          value={formState.primaryContactName}
          onChange={handleFieldChange("primaryContactName")}
        />
        <Input
          label="Contact email"
          type="email"
          value={formState.primaryContactEmail}
          onChange={handleFieldChange("primaryContactEmail")}
        />
        <Input
          label="Contact phone"
          value={formState.primaryContactPhone}
          onChange={handleFieldChange("primaryContactPhone")}
        />
      </Section>
      <Section title="Audit Log">
        {auditEvents.length ? (
          <div className="drawer-audit-list">
            {auditEvents.map((event) => (
              <div key={event.id} className="drawer-audit-item">
                <div className="drawer-audit-item__title">{getAuditEventLabel(event) || "Application update"}</div>
                <div className="drawer-audit-item__meta">
                  {event.actor ? `${event.actor} • ` : ""}
                  {event.createdAt}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="drawer-placeholder">No audit events yet.</div>
        )}
      </Section>
      <div className="drawer-footer-actions">
        <button
          type="button"
          className="btn"
          onClick={handleSave}
          disabled={mutation.isPending || !hasChanges}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
};

export default ApplicationTab;
