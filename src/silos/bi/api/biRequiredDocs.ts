import { api } from "@/api";

export interface BiRequiredDoc {
  doc_type: string;
  display_label: string;
  description: string | null;
  if_startup: boolean;
  sort_order: number;
}

export async function fetchRequiredDocs(): Promise<BiRequiredDoc[]> {
  const res = await api<{ documents: BiRequiredDoc[] }>("/api/v1/bi/required-documents");
  return res.documents ?? [];
}
