import { DEFAULT_BUSINESS_UNIT } from "@/types/businessUnit";
const STORAGE_KEY = "staff-portal.business-unit";
const isBusinessUnit = (value) => value === "BF" || value === "BI" || value === "SLF";
export const resolveBusinessUnit = (value) => isBusinessUnit(value) ? value : DEFAULT_BUSINESS_UNIT;
export const getStoredBusinessUnit = () => {
    if (typeof window === "undefined")
        return DEFAULT_BUSINESS_UNIT;
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    return resolveBusinessUnit(stored);
};
export const withBusinessUnitQuery = (path, businessUnit) => {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}business_unit=${businessUnit}`;
};
