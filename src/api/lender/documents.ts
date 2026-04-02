import { lenderApiClient } from "@/api";

export const fetchDocumentCategories = () => lenderApiClient.get<string[]>(`/lender/documents/categories`);
