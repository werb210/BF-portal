/* =========================================================
   FILE: src/pages/crm/hooks/useContacts.ts
   ========================================================= */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/httpClient";
import { useBusinessUnit } from "@/hooks/useBusinessUnit";
import { withBusinessUnitQuery } from "@/lib/businessUnit";
import { normalizeBusinessUnit } from "@/types/businessUnit";

export function useContacts() {
  const { activeBusinessUnit } = useBusinessUnit();
  const businessUnit = normalizeBusinessUnit(activeBusinessUnit);

  return useQuery({
    queryKey: ["contacts", businessUnit],
    queryFn: ({ signal }) => apiClient.get(withBusinessUnitQuery("/crm/contacts", businessUnit), { signal })
  });
}
