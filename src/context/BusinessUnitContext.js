import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { triggerSafeReload } from "@/utils/reloadGuard";
import { DEFAULT_BUSINESS_UNIT } from "@/types/businessUnit";
const STORAGE_KEY = "staff-portal.business-unit";
const canUseLocalStorage = () => typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
const isBusinessUnit = (value) => value === "BF" || value === "BI" || value === "SLF";
const readStoredBusinessUnit = () => {
    if (!canUseLocalStorage())
        return null;
    try {
        const stored = window.sessionStorage.getItem(STORAGE_KEY);
        return isBusinessUnit(stored) ? stored : null;
    }
    catch {
        return null;
    }
};
const BusinessUnitContext = createContext(undefined);
export const BusinessUnitProvider = ({ children }) => {
    const { authStatus, user } = useAuth();
    const storedBusinessUnit = readStoredBusinessUnit();
    const userBusinessUnits = (user?.businessUnits ?? [
        DEFAULT_BUSINESS_UNIT
    ]).filter(isBusinessUnit);
    const normalizedBusinessUnits = userBusinessUnits.length ? userBusinessUnits : [DEFAULT_BUSINESS_UNIT];
    const fallbackBusinessUnit = normalizedBusinessUnits[0] ?? DEFAULT_BUSINESS_UNIT;
    const preferredUserBusinessUnit = user
        ?.activeBusinessUnit ?? user?.silo;
    const initialBusinessUnit = (storedBusinessUnit && normalizedBusinessUnits.includes(storedBusinessUnit) && storedBusinessUnit) ||
        (preferredUserBusinessUnit && normalizedBusinessUnits.includes(preferredUserBusinessUnit)
            ? preferredUserBusinessUnit
            : fallbackBusinessUnit);
    const [activeBusinessUnit, setActiveBusinessUnitState] = useState(initialBusinessUnit ?? DEFAULT_BUSINESS_UNIT);
    useEffect(() => {
        if (!canUseLocalStorage())
            return;
        try {
            window.sessionStorage.setItem(STORAGE_KEY, activeBusinessUnit);
            window.sessionStorage.setItem("staff-portal.silo", activeBusinessUnit);
        }
        catch {
            // ignore storage errors
        }
    }, [activeBusinessUnit]);
    useEffect(() => {
        if (authStatus !== "authenticated")
            return;
        if (normalizedBusinessUnits.includes(activeBusinessUnit))
            return;
        setActiveBusinessUnitState(fallbackBusinessUnit);
    }, [activeBusinessUnit, authStatus, fallbackBusinessUnit, normalizedBusinessUnits]);
    const setActiveBusinessUnit = (businessUnit) => {
        setActiveBusinessUnitState(businessUnit);
        triggerSafeReload("business_unit_changed");
    };
    const value = useMemo(() => ({
        activeBusinessUnit,
        businessUnits: normalizedBusinessUnits,
        setActiveBusinessUnit
    }), [activeBusinessUnit, normalizedBusinessUnits]);
    return _jsx(BusinessUnitContext.Provider, { value: value, children: children });
};
export default BusinessUnitContext;
