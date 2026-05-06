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

// BF_PORTAL_BLOCK_v165_HIDE_SLF_FROM_SELECTOR_v1
// SLF removed from visible options. Code surface remains under
// src/silos/slf/* + src/pages/slf/* until the full purge.
const ALL_UNITS: BusinessUnit[] = ["BF", "BI"];

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

  // BF_PORTAL_BLOCK_v87_SILO_CASING_AND_BI_PIPELINE_v1 — uppercase value
  // so the Select options (which use uppercase BF/BI/SLF) actually match
  // the lowercase string useSilo() returns. Without this, switching silo
  // looked broken because the dropdown reverted to the first option visually
  // even though the active silo was correct.
  const selectedValue = ((silo as string | null | undefined) ?? "BF").toUpperCase();
  return (
    <Select
      value={selectedValue}
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
