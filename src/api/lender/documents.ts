import { lenderApiClient } from "@/lib/api";

export const fetchDocumentCategories = () => lenderApiClient.get<string[]>(`/lender/documents/categories`);
