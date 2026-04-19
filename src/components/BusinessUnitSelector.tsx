import Select from "@/components/ui/Select";
import { useSilo } from "@/hooks/useSilo";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_BUSINESS_UNIT, normalizeBusinessUnit, type BusinessUnit } from "@/types/businessUnit";

const unitLabels = {
  BF: "Boreal Financial",
  BI: "Boreal Insurance",
  SLF: "Site Level Financial"
} as const;

const isBusinessUnit = (value: unknown): value is BusinessUnit =>
  value === "BF" || value === "BI" || value === "SLF";

const ALL_UNITS: BusinessUnit[] = ["BF", "BI", "SLF"];

const BusinessUnitSelector = () => {
  const { silo, setSilo } = useSilo();
  const { user } = useAuth();

  const userRole = (user as { role?: string } | null)?.role?.toLowerCase();
  const businessUnits =
    userRole === "admin"
      ? ALL_UNITS
      : ((user as { businessUnits?: BusinessUnit[] } | null)?.businessUnits ?? [DEFAULT_BUSINESS_UNIT]).filter(
          isBusinessUnit
        );

  return (
    <Select
      value={silo}
      onChange={(event) =>
        (setSilo as (value: BusinessUnit) => void)(
          normalizeBusinessUnit(event.target.value as "bf" | "bi" | "slf" | BusinessUnit)
        )
      }
      options={(businessUnits.length ? businessUnits : [DEFAULT_BUSINESS_UNIT]).map((businessUnit) => ({
        value: businessUnit,
        label: unitLabels[businessUnit]
      }))}
    />
  );
};

export default BusinessUnitSelector;
