import { lenderApiClient } from "@/api/httpClient";

export const fetchDocumentCategories = () => lenderApiClient.get<string[]>(`/lender/documents/categories`);
