// BF_PORTAL_v850_KS_CRM - the Keystone CRM: the BF CRM screens (contacts, companies, contact and company records with
// their timeline, notes, calls, texts, email, tasks and meetings) running with silo KS. While a /silo/ks/crm page is
// open the api client sends X-Silo: KS on CRM and communications calls (src/config/api.ts), so BF-Server reads and
// writes Keystone records and logs calls, texts and email to them exactly as it does for BF. Links stay inside
// /silo/ks/crm (CrmBaseProvider). The Keystone sales pipeline is the one screen of its own.
import type { CSSProperties, ReactNode } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { btn, toggleRow } from "@/pages/crm/CrmListPage"; // BF_PORTAL_v916_KS_NAV - the Financial CRM's tab row
import { KsSignInGate } from "../KSSilo";
import KsLicensees from "../KsLicensees";
import KsLicenseeDetail from "../KsLicenseeDetail";
import { CrmBaseProvider } from "@/pages/crm/crmBase";
import CrmListPage from "@/pages/crm/CrmListPage";
import ContactDetailPage from "@/pages/crm/contacts/ContactDetailPage";
import CompanyDetailPage from "@/pages/crm/companies/CompanyDetailPage";
import TasksPage from "@/pages/tasks/TasksPage";
import { KsSharedInbox } from "@/pages/communications/CommunicationsPage"; // BF_PORTAL_v895_KS_INBOX
import { KS_ACCENT, canUseKeystone } from "../ksAccess";
import KsPipeline from "./KsPipeline";
import KsSupport from "../support/KsSupport"; // BF_PORTAL_v853_KS_PHONE_SUPPORT
import StartDemoButton from "../StartDemoButton"; // BF_PORTAL_v853_KS_PHONE_SUPPORT

export const KS_CRM_BASE = "/silo/ks/crm";

const banner: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 24px",
  borderBottom: "1px solid var(--ui-border)",
  color: "var(--ui-text-muted)",
  fontSize: 13,
};

const badge: CSSProperties = {
  background: KS_ACCENT,
  color: "#ffffff",
  borderRadius: 6,
  padding: "2px 8px",
  fontSize: 12,
  fontWeight: 700,
};

// BF_PORTAL_v916_KS_NAV - like the Financial silo: one CRM with sub-tabs. "Contacts & companies" holds the usual
// Contacts / Companies / Find duplicates / Clean up tabs; "Licensees" (Keystone Admins) is the licensee list from KS-Ops.
function CrmTabs({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const ops = canUseKeystone(user);
  const tab = (to: string, label: string, match: RegExp) => (
    <NavLink to={to} style={() => ({ ...btn(match.test(window.location.pathname)), textDecoration: "none" })}>{label}</NavLink>
  );
  return (
    <>
      <div style={toggleRow} role="tablist" aria-label="Keystone CRM">
        {tab(`${KS_CRM_BASE}/contacts`, "Contacts & companies", /\/silo\/ks\/crm\/(contacts|companies)/)}
        {ops && tab(`${KS_CRM_BASE}/licensees`, "Licensees", /\/silo\/ks\/crm\/licensees/)}
      </div>
      {children}
    </>
  );
}

export default function KsCrm() {
  return (
    <CrmBaseProvider base={KS_CRM_BASE}>
      <div data-testid="ks-crm" style={{ color: "var(--ui-text)" }}>
        <div style={banner}>
          <span style={badge}>Keystone</span>
          <span>Keystone CRM - these contacts, companies and tasks are kept apart from Boreal Financial.</span>
          <span style={{ marginLeft: "auto" }}><StartDemoButton compact /></span>{/* BF_PORTAL_v853_KS_PHONE_SUPPORT */}
        </div>
        <Routes>
          <Route index element={<Navigate to="contacts" replace />} />
          <Route path="contacts" element={<CrmTabs><CrmListPage key="contacts" initialView="contacts" /></CrmTabs>} />
          <Route path="contacts/:id" element={<ContactDetailPage />} />
          <Route path="companies" element={<CrmTabs><CrmListPage key="companies" initialView="companies" /></CrmTabs>} />
          <Route path="licensees" element={<CrmTabs><div style={{ padding: "16px 24px" }}><KsSignInGate><KsLicensees /></KsSignInGate></div></CrmTabs>} />{/* BF_PORTAL_v916_KS_NAV */}
          <Route path="licensees/:id" element={<div style={{ padding: "16px 24px" }}><KsSignInGate><KsLicenseeDetail /></KsSignInGate></div>} />
          <Route path="companies/:id" element={<CompanyDetailPage />} />
          <Route path="pipeline" element={<KsPipeline />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="inbox" element={<KsSharedInbox />} />{/* BF_PORTAL_v895_KS_INBOX */}
          <Route path="support/*" element={<KsSupport />} />{/* BF_PORTAL_v853_KS_PHONE_SUPPORT */}
          <Route path="*" element={<Navigate to="contacts" replace />} />
        </Routes>
      </div>
    </CrmBaseProvider>
  );
}
