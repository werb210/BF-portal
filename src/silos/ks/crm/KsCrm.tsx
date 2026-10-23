// BF_PORTAL_v850_KS_CRM - the Keystone CRM: the BF CRM screens (contacts, companies, contact and company records with
// their timeline, notes, calls, texts, email, tasks and meetings) running with silo KS. While a /silo/ks/crm page is
// open the api client sends X-Silo: KS on CRM and communications calls (src/config/api.ts), so BF-Server reads and
// writes Keystone records and logs calls, texts and email to them exactly as it does for BF. Links stay inside
// /silo/ks/crm (CrmBaseProvider). The Keystone sales pipeline is the one screen of its own.
import type { CSSProperties } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { CrmBaseProvider } from "@/pages/crm/crmBase";
import CrmListPage from "@/pages/crm/CrmListPage";
import ContactDetailPage from "@/pages/crm/contacts/ContactDetailPage";
import CompanyDetailPage from "@/pages/crm/companies/CompanyDetailPage";
import TasksPage from "@/pages/tasks/TasksPage";
import { KS_ACCENT } from "../ksAccess";
import KsPipeline from "./KsPipeline";

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

export default function KsCrm() {
  return (
    <CrmBaseProvider base={KS_CRM_BASE}>
      <div data-testid="ks-crm" style={{ color: "var(--ui-text)" }}>
        <div style={banner}>
          <span style={badge}>Keystone</span>
          <span>Keystone CRM - these contacts, companies and tasks are kept apart from Boreal Financial.</span>
        </div>
        <Routes>
          <Route index element={<Navigate to="contacts" replace />} />
          <Route path="contacts" element={<CrmListPage key="contacts" initialView="contacts" />} />
          <Route path="contacts/:id" element={<ContactDetailPage />} />
          <Route path="companies" element={<CrmListPage key="companies" initialView="companies" />} />
          <Route path="companies/:id" element={<CompanyDetailPage />} />
          <Route path="pipeline" element={<KsPipeline />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="*" element={<Navigate to="contacts" replace />} />
        </Routes>
      </div>
    </CrmBaseProvider>
  );
}
