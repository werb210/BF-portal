import Select from "@/components/ui/Select";
import { useSilo } from "@/hooks/useSilo";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_BUSINESS_UNIT,
  normalizeBusinessUnit,
  type BusinessUnit,
} from "@/types/businessUnit";

const unitLabels: Record<BusinessUnit, string> = {
  BF: "Boreal Financial",
  BI: "Boreal Insurance",
  SLF: "Site Level Financial",
};

const ALL_UNITS: BusinessUnit[] = ["BF", "BI", "SLF"];

const isBusinessUnit = (value: unknown): value is BusinessUnit =>
  value === "BF" || value === "BI" || value === "SLF";

const BusinessUnitSelector = () => {
  const { silo, setSilo } = useSilo();
  const { user } = useAuth();

  const role = (user as { role?: string } | null)?.role?.toLowerCase();
  const userSilos = (user as { silos?: string[] } | null)?.silos ?? [];
  const validSilos = userSilos.filter(isBusinessUnit);

  // Admin sees all three. Multi-silo user sees their allowlist.
  // Single-silo user sees only their one silo (read-only).
  const visibleUnits: BusinessUnit[] =
    role === "admin"
      ? ALL_UNITS
      : validSilos.length > 0
        ? validSilos
        : [DEFAULT_BUSINESS_UNIT];

  if (visibleUnits.length === 1) {
    const onlyUnit = visibleUnits[0] as BusinessUnit;
    return (
      <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
        {unitLabels[onlyUnit]}
      </span>
    );
  }

  return (
    <Select
      value={silo}
      onChange={(event) =>
        (setSilo as (v: BusinessUnit) => void)(
          normalizeBusinessUnit(
            event.target.value as "bf" | "bi" | "slf" | BusinessUnit
          )
        )
      }
      options={visibleUnits.map((u) => ({
        value: u,
        label: unitLabels[u],
      }))}
    />
  );
};

export default BusinessUnitSelector;
