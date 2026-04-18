import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";

export type DocumentType = {
  id: string;
  key: string;
  label: string;
  category: "always" | "core" | "equipment" | "factoring" | "media" | string;
  sort_order: number;
  active: boolean;
};

export function useDocumentTypes() {
  return useQuery<DocumentType[]>({
    queryKey: ["document-types"],
    queryFn: async () => {
      try {
        const res = await api<{ items: DocumentType[] }>("/api/portal/document-types");
        return Array.isArray(res.items) ? res.items : [];
      } catch {
        // Fallback hardcoded list if API fails
        return [
          { id: "1", key: "six_month_bank_statements", label: "6 months business banking statements", category: "always", sort_order: 0, active: true },
          { id: "2", key: "three_year_financials", label: "3 years accountant prepared financials", category: "core", sort_order: 10, active: true },
          { id: "3", key: "three_year_tax_returns", label: "3 years business tax returns", category: "core", sort_order: 20, active: true },
          { id: "4", key: "pnl_interim", label: "PnL – Interim financials", category: "core", sort_order: 30, active: true },
          { id: "5", key: "balance_sheet_interim", label: "Balance Sheet – Interim financials", category: "core", sort_order: 40, active: true },
          { id: "6", key: "ar", label: "A/R", category: "core", sort_order: 50, active: true },
          { id: "7", key: "ap", label: "A/P", category: "core", sort_order: 60, active: true },
          { id: "8", key: "government_id", label: "2 pieces of Government Issued ID", category: "core", sort_order: 70, active: true },
          { id: "9", key: "void_cheque", label: "VOID cheque or PAD", category: "core", sort_order: 80, active: true },
          { id: "10", key: "purchase_order", label: "Purchase Order (PO)", category: "equipment", sort_order: 10, active: true },
          { id: "11", key: "invoice", label: "Invoice", category: "equipment", sort_order: 20, active: true },
          { id: "12", key: "equipment_details", label: "Equipment details / quote", category: "equipment", sort_order: 30, active: true },
          { id: "13", key: "customer_list", label: "Customer list", category: "factoring", sort_order: 10, active: true },
          { id: "14", key: "sample_invoices", label: "Sample invoices", category: "factoring", sort_order: 20, active: true },
          { id: "15", key: "customer_contracts", label: "Contract(s) with customers", category: "factoring", sort_order: 30, active: true },
          { id: "16", key: "media_budget", label: "Budget", category: "media", sort_order: 10, active: true },
          { id: "17", key: "finance_plan", label: "Finance plan", category: "media", sort_order: 20, active: true },
          { id: "18", key: "tax_credit_status", label: "Tax credit status", category: "media", sort_order: 30, active: true },
          { id: "19", key: "production_schedule", label: "Production schedule", category: "media", sort_order: 40, active: true },
          { id: "20", key: "minimum_guarantees", label: "Minimum guarantees / presales", category: "media", sort_order: 50, active: true },
        ];
      }
    },
    staleTime: 5 * 60_000,
  });
}
