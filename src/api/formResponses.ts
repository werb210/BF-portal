// BF_PORTAL_BLOCK_v303_COLLATERAL_DOCTYPES_v1 — staff-side form-responses helper.
// Mirrors the generic endpoint the BF-client already uses:
//   GET/PUT /api/portal/applications/:id/form-responses/:doc_type  -> { item }
// Used by the Collateral & Facility section in the Lenders tab.
import { api } from "@/api";

export type PortalFormResponse = {
  id: string;
  application_id: string;
  doc_type: string;
  data: Record<string, unknown>;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

function url(applicationId: string, docType: string): string {
  return `/api/portal/applications/${encodeURIComponent(applicationId)}/form-responses/${encodeURIComponent(docType)}`;
}

export async function getFormResponse(
  applicationId: string,
  docType: string
): Promise<PortalFormResponse | null> {
  try {
    const res = await api.get<{ item?: PortalFormResponse }>(url(applicationId, docType));
    return res?.item ?? null;
  } catch {
    // 404 / first-time open: no saved response yet.
    return null;
  }
}

export async function saveFormResponse(
  applicationId: string,
  docType: string,
  data: Record<string, unknown>
): Promise<PortalFormResponse | null> {
  const res = await api.put<{ item?: PortalFormResponse }>(url(applicationId, docType), { data });
  return res?.item ?? null;
}
