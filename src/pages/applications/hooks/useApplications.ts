/* =========================================================
   FILE: src/pages/applications/hooks/useApplications.ts
   ========================================================= */

import { useQuery } from "@tanstack/react-query";
import { pipelineApi } from "@/core/engines/pipeline/pipeline.api";
import { retryUnlessClientError } from "@/api/retryPolicy";
import type { PipelineApplication } from "@/core/engines/pipeline/pipeline.types";
import { useBusinessUnit } from "@/hooks/useBusinessUnit";
import { normalizeBusinessUnit } from "@/types/businessUnit";

export function useApplications(stage: string) {
  const { activeBusinessUnit } = useBusinessUnit();
  const businessUnit = normalizeBusinessUnit(activeBusinessUnit);

  return useQuery({
    queryKey: ["applications", businessUnit, stage],
    queryFn: async ({ signal }) => {
      const res = await pipelineApi.fetchColumn(stage, { businessUnit }, { signal });
      return res.filter((application) => application.stage === stage);
    },
    retry: retryUnlessClientError,
    placeholderData: (previousData) => previousData ?? [],
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
}
