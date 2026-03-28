import { useQuery } from "@tanstack/react-query";
import { fetchApplicationDetails } from "@/api/applications";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import type { ApplicationDetails } from "@/types/application.types";
import { useBusinessUnit } from "@/hooks/useBusinessUnit";

export const useApplicationDetails = () => {
  const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
  const { activeBusinessUnit } = useBusinessUnit();
  const query = useQuery<ApplicationDetails>({
    queryKey: ["applications", activeBusinessUnit, applicationId, "details"],
    queryFn: ({ signal }) => fetchApplicationDetails(applicationId ?? "", { signal, params: { business_unit: activeBusinessUnit } }),
    enabled: Boolean(applicationId)
  });

  return { applicationId, ...query };
};
