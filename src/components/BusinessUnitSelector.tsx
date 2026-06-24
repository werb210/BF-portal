// BF_PORTAL_BLOCK_v166_SILO_BUTTON_SELECTOR_v1
// Two-button segmented selector. Active silo carries a visible outline
// in the silo's accent color; inactive is muted. Replaces the <Select>
// dropdown so the active silo is visible at a glance.
import { useSilo } from "@/hooks/useSilo";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_BUSINESS_UNIT,
  normalizeBusinessUnit,
  type BusinessUnit,
} from "@/types/businessUnit";

const unitLabels: Record<BusinessUnit, { short: string; full: string }> = {
  BF: { short: "Financial", full: "Boreal Financial" },
  BI: { short: "Insurance", full: "Boreal Insurance" },
  SLF: { short: "SLF", full: "Site Level Financial" },
};

const unitAccents: Record<BusinessUnit, string> = {
  BF: "var(--accent)", // RESKIN3::SELECTOR — live silo accent (BF blue)
  BI: "#7c3aed", // matches AppLayout SILO_BRAND.BI
  SLF: "#d97706", // matches AppLayout SILO_BRAND.SLF
};

const ALL_UNITS: BusinessUnit[] = ["BF", "BI"];

// BF_PORTAL_BLOCK_v200_LIVE_TEST_FIXES_v1
const SILO_HOME: Record<BusinessUnit, string> = {
  BF: "/portal",
  BI: "/silo/bi/dashboard",
  SLF: "/portal",
};

const isBusinessUnit = (value: unknown): value is BusinessUnit =>
  value === "BF" || value === "BI" || value === "SLF";

const BusinessUnitSelector = () => {
  const { silo, setSilo } = useSilo();
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = (user as { role?: string } | null)?.role?.toLowerCase();
  const userSilos = (user as { silos?: string[] } | null)?.silos ?? [];
  const validSilos = userSilos.filter(isBusinessUnit);

  const visibleUnits: BusinessUnit[] =
    role === "admin"
      ? ALL_UNITS
      : validSilos.length > 0
        ? validSilos
        : [DEFAULT_BUSINESS_UNIT];

  // Single-silo: static label, no toggle.
  if (visibleUnits.length === 1) {
    const onlyUnit = visibleUnits[0] as BusinessUnit;
    return (
      <span
        style={{
          fontSize: 12,
          color: "var(--ui-text-muted)",
          fontWeight: 600,
        }}
      >
        {unitLabels[onlyUnit].full}
      </span>
    );
  }

  const selectedValue = ((silo as string | null | undefined) ?? "BF").toUpperCase() as BusinessUnit;

  return (
    <div
      role="group"
      aria-label="Active silo"
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 2,
        background: "rgba(0,0,0,0.03)",
        borderRadius: 8,
      }}
    >
      {visibleUnits.map((unit) => {
        const isActive = unit === selectedValue;
        const accent = unitAccents[unit];
        const label = unitLabels[unit];
        return (
          <button
            key={unit}
            type="button"
            onClick={() => {
              // BF_PORTAL_BLOCK_v200_LIVE_TEST_FIXES_v1
              const next = normalizeBusinessUnit(unit);
              (setSilo as (v: BusinessUnit) => void)(next);
              if (next !== selectedValue) navigate(SILO_HOME[next] ?? "/portal");
            }}
            aria-pressed={isActive}
            title={label.full}
            style={{
              minHeight: 36,
              minWidth: 80,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: isActive ? 700 : 500,
              lineHeight: "20px",
              color: isActive ? accent : "var(--ui-text-muted)",
              background: isActive ? "#ffffff" : "transparent",
              border: isActive
                ? `2px solid ${accent}`
                : "1px solid var(--ui-border)",
              // Compensate for the 1px border so heights stay equal.
              boxSizing: "border-box",
              borderRadius: 6,
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s, background 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(event) => {
              if (!isActive) {
                event.currentTarget.style.color = "#0f172a";
                event.currentTarget.style.borderColor = "var(--ui-border)";
              }
            }}
            onMouseLeave={(event) => {
              if (!isActive) {
                event.currentTarget.style.color = "var(--ui-text-muted)";
                event.currentTarget.style.borderColor = "var(--ui-border)";
              }
            }}
          >
            {label.short}
          </button>
        );
      })}
    </div>
  );
};

export default BusinessUnitSelector;
