import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import type { BusinessUnit } from "@/types/businessUnit";
import { DEFAULT_BUSINESS_UNIT } from "@/types/businessUnit";

const STORAGE_KEY = "staff-portal.business-unit";

const canUseLocalStorage = () =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

const isBusinessUnit = (value: unknown): value is BusinessUnit =>
  value === "BF" || value === "BI" || value === "SLF";

const readStoredBusinessUnit = (): BusinessUnit | null => {
  if (!canUseLocalStorage()) return null;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    return isBusinessUnit(stored) ? stored : null;
  } catch {
    return null;
  }
};

export type BusinessUnitContextValue = {
  activeBusinessUnit: BusinessUnit;
  businessUnits: BusinessUnit[];
  setActiveBusinessUnit: (businessUnit: BusinessUnit) => void;
};

const BusinessUnitContext = createContext<BusinessUnitContextValue | undefined>(undefined);

export const getActiveBusinessUnit = (): BusinessUnit => {
  if (typeof window === "undefined") return DEFAULT_BUSINESS_UNIT;
  try {
    const fromSession = window.sessionStorage.getItem(STORAGE_KEY);
    if (isBusinessUnit(fromSession)) return fromSession;
    const legacy = window.sessionStorage.getItem("staff-portal.silo");
    if (isBusinessUnit(legacy)) return legacy;
  } catch {
    // ignore storage errors
  }
  return DEFAULT_BUSINESS_UNIT;
};


export const BusinessUnitProvider = ({ children }: { children: React.ReactNode }) => {
  const { authStatus, user } = useAuth();
  const storedBusinessUnit = readStoredBusinessUnit();
  // BF_PORTAL_BLOCK_BI_SILO_SYNC_v1 — read user.silos (JWT field). Admins
  // get the full allowlist so they can switch into any silo.
  const userRole = (user as { role?: string } | null)?.role?.toLowerCase();
  const isAdmin = userRole === "admin";
  const rawSilos = (user as { silos?: string[] } | null)?.silos ?? [];
  const userBusinessUnits: BusinessUnit[] = rawSilos
    .map((s) => String(s).toUpperCase())
    .filter(isBusinessUnit);
  // BF_PORTAL_ADMIN_SLF_ALLOWLIST_v1 - v165 hid SLF from the admin allowlist
  // while the SLF silo was dormant. The selector still renders an SLF button,
  // so clicking it set the silo and the guard effect below immediately snapped
  // it back to BF - the button looked dead. SLF-server now syncs, and admins
  // have SLF ticked under Silo access, so admins get all three silos.
  const normalizedBusinessUnits: BusinessUnit[] = isAdmin
    ? ["BF", "BI", "SLF"]
    : (userBusinessUnits.length ? userBusinessUnits : [DEFAULT_BUSINESS_UNIT]);
  const fallbackBusinessUnit = normalizedBusinessUnits[0] ?? DEFAULT_BUSINESS_UNIT;
  const preferredUserBusinessUnit = ((user as { silo?: string } | null)?.silo
    ? String((user as { silo?: string }).silo).toUpperCase()
    : undefined) as BusinessUnit | undefined;
  const initialBusinessUnit =
    (storedBusinessUnit && normalizedBusinessUnits.includes(storedBusinessUnit) && storedBusinessUnit) ||
    (preferredUserBusinessUnit && normalizedBusinessUnits.includes(preferredUserBusinessUnit)
      ? preferredUserBusinessUnit
      : fallbackBusinessUnit);

  const [activeBusinessUnit, setActiveBusinessUnitState] = useState<BusinessUnit>(initialBusinessUnit ?? DEFAULT_BUSINESS_UNIT);

  useEffect(() => {
    if (!canUseLocalStorage()) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, activeBusinessUnit);
      window.sessionStorage.setItem("staff-portal.silo", activeBusinessUnit);
    } catch {
      // ignore storage errors
    }
  }, [activeBusinessUnit]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    if (normalizedBusinessUnits.includes(activeBusinessUnit)) return;
    setActiveBusinessUnitState(fallbackBusinessUnit);
  }, [activeBusinessUnit, authStatus, fallbackBusinessUnit, normalizedBusinessUnits]);

  // BF_PORTAL_BLOCK_v200_LIVE_TEST_FIXES_v1 — pure state update; the
  // previous triggerSafeReload caused a full page reload that the 30s
  // reloadGuard silently suppressed on rapid second clicks (operator
  // reported "have to click a couple times"). Navigation to the silo
  // home page is now handled by BusinessUnitSelector.
  const setActiveBusinessUnit = (businessUnit: BusinessUnit) => {
    setActiveBusinessUnitState(businessUnit);
  };

  const value = useMemo(
    () => ({
      activeBusinessUnit,
      businessUnits: normalizedBusinessUnits,
      setActiveBusinessUnit
    }),
    [activeBusinessUnit, normalizedBusinessUnits]
  );

  return <BusinessUnitContext.Provider value={value}>{children}</BusinessUnitContext.Provider>;
};

export default BusinessUnitContext;


export const useBusinessUnit = (): BusinessUnitContextValue => {
  const ctx = useContext(BusinessUnitContext);
  if (!ctx) {
    return {
      activeBusinessUnit: getActiveBusinessUnit(),
      businessUnits: [getActiveBusinessUnit()],
      setActiveBusinessUnit: () => undefined
    };
  }
  return ctx;
};
