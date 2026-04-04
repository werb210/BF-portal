/* =========================================================
   FILE: src/pages/crm/hooks/useContacts.ts
   ========================================================= */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { useBusinessUnit } from "@/hooks/useBusinessUnit";
import { withBusinessUnitQuery } from "@/lib/businessUnit";
import { normalizeBusinessUnit } from "@/types/businessUnit";
export function useContacts() {
    const { activeBusinessUnit } = useBusinessUnit();
    const businessUnit = normalizeBusinessUnit(activeBusinessUnit);
    return useQuery({
        queryKey: ["contacts", businessUnit],
        queryFn: ({ signal }) => api.get(withBusinessUnitQuery("/api/v1/crm/contacts", businessUnit), { signal })
    });
}
