import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPortalApplication, updatePortalApplication } from "@/api/applications";
import Input from "@/components/ui/Input";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { getErrorMessage } from "@/utils/errors";
import { getAuditEventLabel } from "@/components/Timeline/auditEventLabels";
const Section = ({ title, children }) => (_jsxs("div", { className: "drawer-section", children: [_jsx("div", { className: "drawer-section__title", children: title }), _jsx("div", { className: "drawer-section__body", children: children })] }));
const Field = ({ label, value }) => (_jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: label }), _jsx("dd", { children: value || "-" })] }));
const Divider = () => _jsx("hr", { className: "my-3 border-slate-200" });
const EMPTY_FORM_STATE = {
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
const isRecord = (value) => typeof value === "object" && value !== null;
const pickRecord = (source, keys) => {
    for (const key of keys) {
        const value = source[key];
        if (isRecord(value))
            return value;
    }
    return null;
};
const readValue = (records, keys) => {
    for (const record of records) {
        if (!record)
            continue;
        for (const key of keys) {
            if (key in record) {
                const value = record[key];
                if (typeof value === "string")
                    return value;
                if (typeof value === "number" || typeof value === "boolean")
                    return String(value);
            }
        }
    }
    return "";
};
const normalizeFormState = (data) => {
    if (!data || !isRecord(data))
        return { ...EMPTY_FORM_STATE };
    const businessRecord = pickRecord(data, ["business", "businessDetails", "business_details", "businessInfo", "business_info"]) ?? null;
    const operationsRecord = pickRecord(data, ["operations", "operationsDetails", "operations_details", "operationsInfo", "operations_info"]) ??
        null;
    const contactRecord = pickRecord(data, ["primaryContact", "primary_contact", "contactInfo", "contact_info", "applicantInfo"]) ?? null;
    return {
        businessLegalName: readValue([businessRecord, data], ["legalName", "legal_name", "businessLegalName", "business_legal_name", "businessName", "business_name"]),
        businessOperatingName: readValue([businessRecord, data], ["operatingName", "operating_name", "businessOperatingName", "business_operating_name"]),
        businessAddress: readValue([businessRecord, data], ["address", "businessAddress", "business_address", "location", "businessLocation"]),
        businessStructure: readValue([businessRecord, data], ["structure", "businessStructure", "business_structure", "entityType", "entity_type"]),
        businessIndustry: readValue([businessRecord, data], ["industry", "industryType", "industry_type"]),
        businessWebsiteUrl: readValue([businessRecord, data], ["websiteUrl", "website_url", "website", "url", "businessWebsite"]),
        operationsStartDate: readValue([operationsRecord, data], ["startDate", "start_date", "businessStartDate", "business_start_date"]),
        operationsYearsInBusiness: readValue([operationsRecord, data], ["yearsInBusiness", "years_in_business", "businessYears", "business_years"]),
        operationsProductCategory: readValue([operationsRecord, data], ["productCategory", "product_category", "category"]),
        operationsUseOfFunds: readValue([operationsRecord, data], ["useOfFunds", "use_of_funds", "fundsUse", "funds_use"]),
        operationsRequestedAmount: readValue([operationsRecord, data], ["requestedAmount", "requested_amount", "amountRequested", "amount_requested"]),
        primaryContactName: readValue([contactRecord, data], ["name", "contactName", "contact_name"]),
        primaryContactEmail: readValue([contactRecord, data], ["email", "contactEmail", "contact_email"]),
        primaryContactPhone: readValue([contactRecord, data], ["phone", "contactPhone", "contact_phone"]),
        source: readValue([data], ["source", "leadSource", "lead_source"]),
        prequalAnnualRevenue: readValue([operationsRecord, data], ["annualRevenue", "annual_revenue", "yearlyRevenue", "yearly_revenue"]),
        prequalMonthlyRevenue: readValue([operationsRecord, data], ["monthlyRevenue", "monthly_revenue"]),
        prequalCreditRange: readValue([operationsRecord, data], ["creditRange", "credit_range"])
    };
};
const normalizeCreditReadinessData = (data) => {
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
    const businessRecord = pickRecord(data, ["business", "businessDetails", "business_details", "businessInfo", "business_info"]) ?? null;
    const operationsRecord = pickRecord(data, ["operations", "operationsDetails", "operations_details", "operationsInfo", "operations_info"]) ??
        null;
    const contactRecord = pickRecord(data, ["primaryContact", "primary_contact", "contactInfo", "contact_info", "applicantInfo"]) ?? null;
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
const normalizeAuditEvents = (data) => {
    if (!data || !isRecord(data))
        return [];
    const audit = data.auditTimeline ?? data.audit_events;
    if (!Array.isArray(audit))
        return [];
    return audit.filter((event) => Boolean(event) && typeof event === "object");
};
const parseNumberIfPossible = (value) => {
    const trimmed = value.trim();
    if (!trimmed)
        return value;
    const numberValue = Number(trimmed);
    if (Number.isFinite(numberValue))
        return numberValue;
    return value;
};
const buildPatchPayload = (current, baseline) => {
    const updates = {};
    const setField = (section, key, value) => {
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
    const [formState, setFormState] = useState({ ...EMPTY_FORM_STATE });
    const [baselineState, setBaselineState] = useState({ ...EMPTY_FORM_STATE });
    const [feedback, setFeedback] = useState(null);
    const { data: application, isLoading, error } = useQuery({
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
    const hasChanges = useMemo(() => Object.keys(formState).some((key) => formState[key] !== baselineState[key]), [baselineState, formState]);
    const mutation = useMutation({
        mutationFn: async (updates) => {
            if (!applicationId)
                throw new Error("Missing application id.");
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
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view details." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading application data\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load application data.") });
    if (!application)
        return _jsx("div", { className: "drawer-placeholder", children: "No application data" });
    const handleFieldChange = (key) => (event) => {
        setFormState((prev) => ({ ...prev, [key]: event.target.value }));
    };
    const handleSave = async () => {
        const updates = buildPatchPayload(formState, baselineState);
        if (Object.keys(updates).length === 0)
            return;
        setFeedback(null);
        mutation.mutate(updates);
    };
    return (_jsxs("div", { className: "drawer-tab drawer-tab__application", children: [feedback ? (_jsx("div", { className: `documents-feedback documents-feedback--${feedback.type}`, role: "status", children: feedback.message })) : null, _jsxs(Section, { title: "Structured Data", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Field, { label: "Industry", value: readinessData.industry }), _jsx(Field, { label: "Years in Business", value: readinessData.yearsInBusiness }), _jsx(Field, { label: "Annual Revenue", value: readinessData.annualRevenue }), _jsx(Field, { label: "Monthly Revenue", value: readinessData.monthlyRevenue }), _jsx(Field, { label: "Accounts Receivable", value: readinessData.arBalance }), _jsx(Field, { label: "Available Collateral", value: readinessData.availableCollateral || "Not Provided" })] }), _jsx(Divider, {}), _jsxs("dl", { className: "drawer-kv-list", children: [_jsx(Field, { label: "Company Name", value: readinessData.companyName }), _jsx(Field, { label: "Full Name", value: readinessData.fullName }), _jsx(Field, { label: "Email", value: readinessData.email }), _jsx(Field, { label: "Phone", value: readinessData.phone })] })] }), _jsxs(Section, { title: "Business", children: [_jsx(Input, { label: "Legal name", value: formState.businessLegalName, onChange: handleFieldChange("businessLegalName") }), _jsx(Input, { label: "Operating name", value: formState.businessOperatingName, onChange: handleFieldChange("businessOperatingName") }), _jsx(Input, { label: "Business address", value: formState.businessAddress, onChange: handleFieldChange("businessAddress") }), _jsx(Input, { label: "Business structure", value: formState.businessStructure, onChange: handleFieldChange("businessStructure") }), _jsx(Input, { label: "Industry", value: formState.businessIndustry, onChange: handleFieldChange("businessIndustry") }), _jsx(Input, { label: "Website URL", value: formState.businessWebsiteUrl, onChange: handleFieldChange("businessWebsiteUrl") })] }), formState.source === "website" ? (_jsxs(Section, { title: "Website Pre-Application Data", children: [_jsxs("div", { children: ["Years in Business: ", formState.operationsYearsInBusiness || "—"] }), _jsxs("div", { children: ["Annual Revenue: ", formState.prequalAnnualRevenue || "—"] }), _jsxs("div", { children: ["Monthly Revenue: ", formState.prequalMonthlyRevenue || "—"] }), _jsxs("div", { children: ["Requested Amount: ", formState.operationsRequestedAmount || "—"] }), _jsxs("div", { children: ["Credit Range: ", formState.prequalCreditRange || "—"] })] })) : null, _jsxs(Section, { title: "Operations", children: [_jsx(Input, { label: "Start date", type: "date", value: formState.operationsStartDate, onChange: handleFieldChange("operationsStartDate") }), _jsx(Input, { label: "Years in business", type: "number", value: formState.operationsYearsInBusiness, onChange: handleFieldChange("operationsYearsInBusiness") }), _jsx(Input, { label: "Product category", value: formState.operationsProductCategory, onChange: handleFieldChange("operationsProductCategory") }), _jsx(Input, { label: "Use of funds", value: formState.operationsUseOfFunds, onChange: handleFieldChange("operationsUseOfFunds") }), _jsx(Input, { label: "Requested amount", type: "number", value: formState.operationsRequestedAmount, onChange: handleFieldChange("operationsRequestedAmount") })] }), _jsxs(Section, { title: "Primary Contact", children: [_jsx(Input, { label: "Contact name", value: formState.primaryContactName, onChange: handleFieldChange("primaryContactName") }), _jsx(Input, { label: "Contact email", type: "email", value: formState.primaryContactEmail, onChange: handleFieldChange("primaryContactEmail") }), _jsx(Input, { label: "Contact phone", value: formState.primaryContactPhone, onChange: handleFieldChange("primaryContactPhone") })] }), _jsx(Section, { title: "Audit Log", children: auditEvents.length ? (_jsx("div", { className: "drawer-audit-list", children: auditEvents.map((event) => (_jsxs("div", { className: "drawer-audit-item", children: [_jsx("div", { className: "drawer-audit-item__title", children: getAuditEventLabel(event) || "Application update" }), _jsxs("div", { className: "drawer-audit-item__meta", children: [event.actor ? `${event.actor} • ` : "", event.createdAt] })] }, event.id))) })) : (_jsx("div", { className: "drawer-placeholder", children: "No audit events yet." })) }), _jsx("div", { className: "drawer-footer-actions", children: _jsx("button", { type: "button", className: "btn", onClick: handleSave, disabled: mutation.isPending || !hasChanges, children: mutation.isPending ? "Saving…" : "Save" }) })] }));
};
export default ApplicationTab;
