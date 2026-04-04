import { lenderApiClient } from "@/api";
export const fetchDocumentCategories = () => lenderApiClient.get(`/lender/documents/categories`);
