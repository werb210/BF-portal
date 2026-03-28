/* =========================================================
   FILE: src/pages/lenders/hooks/useLenders.ts
   ========================================================= */

import { useQuery } from "@tanstack/react-query";
import { fetchLenders } from "@/api/lenders";

export function useLenders() {
  return useQuery({
    queryKey: ["lenders"],
    queryFn: ({ signal }) => fetchLenders({ signal }),
    placeholderData: (previousData) => previousData ?? [],
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
}
