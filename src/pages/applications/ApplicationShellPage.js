import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import AppLoading from "@/components/layout/AppLoading";
import ErrorBanner from "@/components/ui/ErrorBanner";
import ApplicationCard from "@/pages/applications/ApplicationCard";
import { PIPELINE_STAGE_LABELS, normalizeStageId } from "@/core/engines/pipeline/pipeline.types";
import { fetchPortalApplication, openPortalApplication } from "@/api/applications";
import { fetchApplicationReadiness } from "@/api/readiness";
const APPLICATION_TABS = [
    { id: "application", label: "Application" },
    { id: "banking", label: "Banking Analysis" },
    { id: "financials", label: "Financials" },
    { id: "documents", label: "Documents" },
    { id: "comms", label: "Comms" },
    { id: "credit-summary", label: "Credit Summary" },
    { id: "notes", label: "Notes" },
    { id: "lenders", label: "Lenders" }
];
const OPENED_APPLICATIONS_KEY = "portal.applications.opened";
const readOpenedApplications = () => {
    if (typeof window === "undefined")
        return new Set();
    const stored = window.sessionStorage.getItem(OPENED_APPLICATIONS_KEY);
    if (!stored)
        return new Set();
    try {
        return new Set(JSON.parse(stored));
    }
    catch {
        return new Set();
    }
};
const writeOpenedApplications = (opened) => {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.setItem(OPENED_APPLICATIONS_KEY, JSON.stringify(Array.from(opened)));
};
const parsePortalApplication = (data, id) => {
    if (!data || typeof data !== "object") {
        return { id, businessName: "Unknown business", stage: "Received" };
    }
    const record = data;
    const businessName = typeof record.businessName === "string"
        ? record.businessName
        : typeof record.business_name === "string"
            ? record.business_name
            : typeof record.applicant === "string"
                ? record.applicant
                : typeof record.business === "object" && record.business && "name" in record.business
                    ? String(record.business.name ?? "Unknown business")
                    : "Unknown business";
    const stageValue = typeof record.current_stage === "string"
        ? record.current_stage
        : typeof record.stage === "string"
            ? record.stage
            : "Received";
    return { id, businessName, stage: stageValue };
};
const resolveStageLabel = (stage) => {
    const normalized = normalizeStageId(stage);
    return PIPELINE_STAGE_LABELS[normalized] ?? stage;
};
const ApplicationShellPage = () => {
    const { id } = useParams();
    const firstTabId = APPLICATION_TABS[0]?.id ?? "application";
    const [selectedTab, setSelectedTab] = useState(firstTabId);
    const applicationQuery = useQuery({
        queryKey: ["portal-application", id],
        queryFn: ({ signal }) => fetchPortalApplication(id ?? "", { signal }),
        enabled: Boolean(id),
        retry: false
    });
    const openMutation = useMutation({
        mutationFn: (applicationId) => openPortalApplication(applicationId)
    });
    const readinessQuery = useQuery({
        queryKey: ["portal-application", id, "readiness"],
        queryFn: ({ signal }) => fetchApplicationReadiness(id ?? "", { signal }),
        enabled: selectedTab === "comms" && Boolean(id),
        retry: false
    });
    useEffect(() => {
        if (!id)
            return;
        const openedApplications = readOpenedApplications();
        if (openedApplications.has(id))
            return;
        openedApplications.add(id);
        writeOpenedApplications(openedApplications);
        openMutation.mutate(id);
    }, [id, openMutation]);
    const application = useMemo(() => {
        if (!id) {
            return { id: "unknown", businessName: "Unknown business", stage: "Received" };
        }
        return parsePortalApplication(applicationQuery.data, id);
    }, [applicationQuery.data, id]);
    const stageLabel = resolveStageLabel(application.stage);
    return (_jsx("div", { className: "application-shell", children: _jsxs(Card, { title: "Application", children: [applicationQuery.isLoading && _jsx(AppLoading, {}), applicationQuery.error && _jsx(ErrorBanner, { message: "Unable to load this application." }), _jsxs("div", { className: "application-shell__header", children: [_jsxs("div", { children: [_jsx("div", { className: "application-shell__title", children: application.businessName }), _jsx("span", { className: "application-shell__badge", children: stageLabel })] }), _jsx("button", { className: "ui-button ui-button--secondary", type: "button", children: "Call Client" })] }), _jsx(ApplicationCard, { tabs: APPLICATION_TABS, selectedTab: selectedTab, onSelect: setSelectedTab, children: selectedTab === "comms" ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "drawer-section", children: [_jsx("div", { className: "drawer-section__title", children: "Readiness Summary" }), readinessQuery.isLoading ? _jsx("div", { className: "drawer-placeholder", children: "Loading readiness details\u2026" }) : null, readinessQuery.error ? _jsx("div", { className: "drawer-placeholder", children: "Unable to load readiness details." }) : null, !readinessQuery.isLoading && !readinessQuery.error ? (readinessQuery.data?.lead ? (_jsxs("div", { className: "drawer-kv-list", children: [_jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: "Company" }), _jsx("dd", { children: readinessQuery.data.lead.companyName || "-" })] }), _jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: "Contact" }), _jsx("dd", { children: readinessQuery.data.lead.contactName || "-" })] }), _jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: "Industry" }), _jsx("dd", { children: readinessQuery.data.lead.industry || "-" })] }), _jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: "Monthly Revenue" }), _jsx("dd", { children: readinessQuery.data.lead.monthlyRevenue ?? "-" })] })] })) : (_jsx("div", { className: "drawer-placeholder", children: "No linked readiness lead." }))) : null] }), _jsxs("div", { className: "drawer-section", children: [_jsx("div", { className: "drawer-section__title", children: "Transcript History" }), readinessQuery.data?.transcriptHistory.length ? (_jsx("ul", { className: "drawer-list", children: readinessQuery.data.transcriptHistory.map((item, index) => (_jsx("li", { className: "drawer-list__item", children: item }, `${index}-${item.slice(0, 16)}`))) })) : (_jsx("div", { className: "drawer-placeholder", children: "No transcript history available yet." }))] })] })) : (_jsx("div", { className: "application-shell__placeholder", children: "Coming in next block." })) })] }) }));
};
export default ApplicationShellPage;
