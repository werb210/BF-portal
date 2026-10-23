// BF_PORTAL_v850_KS_CRM - where the CRM screens live. The BF CRM is at /crm; the same screens also run inside the
// Keystone silo at /silo/ks/crm, so their links (contact, company, back) are built from this base, not a fixed "/crm".
import { createContext, useContext, type ReactNode } from "react";

const CrmBaseContext = createContext("/crm");

export function CrmBaseProvider({ base, children }: { base: string; children: ReactNode }) {
  return <CrmBaseContext.Provider value={base}>{children}</CrmBaseContext.Provider>;
}

export function useCrmBase(): string {
  return useContext(CrmBaseContext);
}
