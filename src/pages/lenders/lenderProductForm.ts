import type { ProductDocumentRequirement, LenderProduct } from "@/types/lenderManagement.models";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  LENDER_PRODUCT_CATEGORY_LABELS,
  type LenderProductCategory,
  type RateType
} from "@/types/lenderManagement.types";

type DocumentOption = {
  value: string;
  label: string;
  locked?: boolean;
};

export const PRODUCT_DOCUMENT_OPTIONS: DocumentOption[] = [
  { value: "six_month_bank_statements", label: "6 months bank statements", locked: true },
  ...DOCUMENT_TYPES.map((docType) => ({
    value: docType,
    label: DOCUMENT_TYPE_LABELS[docType]
  }))
];

const normalizeDocKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export const getDefaultRequiredDocuments = () =>
  PRODUCT_DOCUMENT_OPTIONS.filter((option) => option.locked).map((option) => option.value);

export const mapRequiredDocumentsToValues = (docs: ProductDocumentRequirement[] = []) => {
  if (!docs.length) return [];
  const optionMap = new Map(PRODUCT_DOCUMENT_OPTIONS.map((option) => [normalizeDocKey(option.label), option.value]));
  const selected = new Set<string>();
  docs.forEach((doc) => {
    const label = doc.category?.trim() || "";
    const mapped = optionMap.get(normalizeDocKey(label));
    selected.add(mapped ?? label);
  });
  return Array.from(selected);
};

export const buildRequiredDocumentsPayload = (values: string[]): ProductDocumentRequirement[] => {
  return values.map((value) => {
    const option = PRODUCT_DOCUMENT_OPTIONS.find((item) => item.value === value);
    return {
      category: option?.label ?? value,
      required: true,
      description: null
    };
  });
};

export const deriveProductName = (category: LenderProductCategory) => LENDER_PRODUCT_CATEGORY_LABELS[category];

export const deriveCurrency = (country: string, fallback?: string | null) => {
  const normalized = country.trim().toUpperCase();
  if (normalized === "US") return "USD";
  if (normalized === "CA") return "CAD";
  if (normalized === "BOTH") return "CAD/USD";
  return fallback ?? "USD";
};

export const normalizeProductCountry = (value?: string | null) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";
  const normalized = trimmed.toUpperCase();
  if (normalized === "CA" || normalized === "CANADA") return "CA";
  if (normalized === "US" || normalized === "USA" || normalized === "UNITED STATES") return "US";
  if (normalized === "BOTH") return "BOTH";
  return trimmed;
};

export const splitCountrySelection = (value?: string | null): string[] => {
  const normalized = normalizeProductCountry(value);
  if (normalized === "BOTH") return ["CA", "US"];
  if (normalized === "CA") return ["CA"];
  if (normalized === "US") return ["US"];
  return [];
};

export const normalizeCountrySelection = (countries: string[]) => {
  const normalized = countries.map((country) => normalizeProductCountry(country)).filter(Boolean);
  const hasCA = normalized.includes("CA");
  const hasUS = normalized.includes("US");
  if (hasCA && hasUS) return "BOTH";
  if (hasCA) return "CA";
  if (hasUS) return "US";
  return "";
};

export const resolveRateType = (rateType?: RateType) =>
  rateType === "variable" || rateType === "fixed" ? rateType : "fixed";

const formatRateNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const numeric = trimmed.replace(/[^\d.]/g, "");
  return numeric;
};

export const normalizeVariableRateInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const numeric = formatRateNumber(value);
  if (!numeric) return "Prime + ";
  return `Prime + ${numeric}%`;
};

export const isValidVariableRate = (value: string) =>
  /^prime\s*\+\s*\d+(\.\d+)?%?$/i.test(value.trim());

export const normalizeInterestInput = (rateType: RateType, value: string) =>
  rateType === "variable" ? normalizeVariableRateInput(value) : value;

export const formatInterestPayload = (rateType: RateType, value: string) => {
  if (rateType === "variable") {
    return normalizeVariableRateInput(value).replace(/\s+/g, " ").trim();
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? 0 : numeric;
};

export const getRateDefaults = (product?: LenderProduct | null) => {
  const resolvedRateType = resolveRateType(product?.rateType);
  const minRate =
    typeof product?.interestRateMin === "number"
      ? String(product?.interestRateMin)
      : typeof product?.interestRateMin === "string"
        ? product?.interestRateMin
        : "";
  const maxRate =
    typeof product?.interestRateMax === "number"
      ? String(product?.interestRateMax)
      : typeof product?.interestRateMax === "string"
        ? product?.interestRateMax
        : "";
  return {
    rateType: resolvedRateType,
    interestMin: resolvedRateType === "variable" ? normalizeVariableRateInput(minRate) : minRate,
    interestMax: resolvedRateType === "variable" ? normalizeVariableRateInput(maxRate) : maxRate
  };
};
