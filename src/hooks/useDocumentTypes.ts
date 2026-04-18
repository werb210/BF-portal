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
      const res = await api<{ items: DocumentType[] }>("/api/portal/document-types");
      return Array.isArray(res.items) ? res.items : [];
    },
    staleTime: 5 * 60_000,
  });
}
