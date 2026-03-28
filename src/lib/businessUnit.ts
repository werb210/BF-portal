import { DEFAULT_BUSINESS_UNIT, type BusinessUnit } from "@/types/businessUnit";

const STORAGE_KEY = "staff-portal.business-unit";

const isBusinessUnit = (value: unknown): value is BusinessUnit =>
  value === "BF" || value === "BI" || value === "SLF";

export const resolveBusinessUnit = (value: unknown): BusinessUnit =>
  isBusinessUnit(value) ? value : DEFAULT_BUSINESS_UNIT;

export const getStoredBusinessUnit = (): BusinessUnit => {
  if (typeof window === "undefined") return DEFAULT_BUSINESS_UNIT;
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  return resolveBusinessUnit(stored);
};

export const withBusinessUnitQuery = (path: string, businessUnit: BusinessUnit) => {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}business_unit=${businessUnit}`;
};
