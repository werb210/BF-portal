// BF_PORTAL_v870_CRM_DATA_MODEL - custom fields on contacts, companies and applications (BF-Server /api/custom-fields).
// The server is the authority on validation; checkValue() here only gives instant feedback while typing.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";

export type ObjectType = "contact" | "company" | "application";
export type FieldType = "text" | "long_text" | "number" | "money" | "date" | "single_select" | "multi_select" | "checkbox" | "url" | "email" | "phone";
export type FieldOption = { value: string; label: string };
export type CustomField = {
  id: string;
  object_type: ObjectType;
  name: string;
  label: string;
  field_type: FieldType;
  options: FieldOption[];
  required: boolean;
  group_name: string | null;
  description: string | null;
  sort_order: number;
  archived_at: string | null;
};
export type Values = Record<string, unknown>;

export const OBJECT_LABEL: Record<ObjectType, string> = { contact: "Contacts", company: "Companies", application: "Deals / applications" };
export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "Single-line text", long_text: "Multi-line text", number: "Number", money: "Money", date: "Date",
  single_select: "Dropdown (pick one)", multi_select: "Multiple checkboxes (pick any)", checkbox: "Yes / no",
  url: "Website address", email: "Email address", phone: "Phone number",
};
export const FIELD_TYPES = Object.keys(FIELD_TYPE_LABEL) as FieldType[];
export const SELECT_TYPES: ReadonlySet<FieldType> = new Set(["single_select", "multi_select"]);

const BASE = "/api/custom-fields";

export const listFields = async (object: ObjectType, includeArchived = false) =>
  (await api.get<{ fields: CustomField[] }>(`${BASE}/${object}`, { params: includeArchived ? { include_archived: 1 } : undefined })).fields ?? [];
export type FieldInput = { label: string; name?: string; field_type: FieldType; options?: Array<string | FieldOption>; required?: boolean; group_name?: string; description?: string };
export const createField = async (object: ObjectType, body: FieldInput) => (await api.post<{ field: CustomField }>(`${BASE}/${object}`, body)).field;
export const updateField = async (object: ObjectType, id: string, body: Partial<FieldInput>) => (await api.patch<{ field: CustomField }>(`${BASE}/${object}/${id}`, body)).field;
export const setFieldArchived = async (object: ObjectType, id: string, archived: boolean) =>
  (await api.post<{ field: CustomField }>(`${BASE}/${object}/${id}/${archived ? "archive" : "unarchive"}`)).field;
export const reorderFields = (object: ObjectType, ids: string[]) => api.put(`${BASE}/${object}/order`, { ids });
export const getRecordValues = (object: ObjectType, id: string) =>
  api.get<{ fields: CustomField[]; values: Values }>(`${BASE}/${object}/records/${encodeURIComponent(id)}`);
export const saveRecordValues = async (object: ObjectType, id: string, values: Values) =>
  (await api.put<{ values: Values }>(`${BASE}/${object}/records/${encodeURIComponent(id)}`, { values })).values;

/** Active fields of an object for list columns and filters. Empty while loading or when the server has none. */
export function useCustomFields(object: ObjectType): { fields: CustomField[]; reload: () => void } {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [key, setKey] = useState(0);
  useEffect(() => {
    let off = false;
    listFields(object).then((f) => { if (!off) setFields(Array.isArray(f) ? f : []); }).catch(() => { if (!off) setFields([]); });
    return () => { off = true; };
  }, [object, key]);
  const reload = useCallback(() => setKey((k) => k + 1), []);
  return { fields, reload };
}

export function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
}

/** Text for a stored value: option labels, Yes/No, money with two decimals, "a; b" for several. */
export function displayValue(field: CustomField, v: unknown): string {
  if (isEmpty(v)) return "";
  const label = (x: unknown) => field.options.find((o) => o.value === x)?.label ?? String(x);
  switch (field.field_type) {
    case "checkbox": return v === true ? "Yes" : v === false ? "No" : String(v);
    case "single_select": return label(v);
    case "multi_select": return (Array.isArray(v) ? v : [v]).map(label).join("; ");
    case "money": return Number.isFinite(Number(v)) ? Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v);
    default: return String(v);
  }
}

/** Instant check while editing (the server re-checks). null = fine. */
export function checkValue(field: CustomField, v: unknown): string | null {
  if (isEmpty(v)) return field.required ? `${field.label} is required.` : null;
  const s = typeof v === "string" ? v.trim() : v;
  switch (field.field_type) {
    case "number": case "money":
      return /^-?[\d,]*\.?\d+$/.test(String(s).replace(/[$\s]/g, "")) ? null : `${field.label}: enter a number.`;
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(String(s)) ? null : `${field.label}: enter a date.`;
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s)) ? null : `${field.label}: enter an email address.`;
    case "url":
      return /^(https?:\/\/)?[^\s/$.?#]+\.[^\s]+$/i.test(String(s)) ? null : `${field.label}: enter a web address.`;
    case "phone": {
      const digits = String(s).replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15 ? null : `${field.label}: enter a phone number.`;
    }
    case "text":
      return String(s).length > 1000 ? `${field.label}: at most 1000 characters.` : null;
    default:
      return null;
  }
}

/** Fields grouped for display: [group name or "", fields in order]. */
export function groupFields(fields: CustomField[]): Array<[string, CustomField[]]> {
  const map = new Map<string, CustomField[]>();
  for (const f of [...fields].sort((a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label))) {
    const g = f.group_name?.trim() || "";
    map.set(g, [...(map.get(g) ?? []), f]);
  }
  return [...map.entries()].sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)));
}

/** Rows for CSV export: the record's columns plus one column per custom field (by label), custom_fields dropped. */
export function rowsWithCustomFields<T extends Record<string, unknown>>(rows: T[], fields: CustomField[]): Array<Record<string, unknown>> {
  return rows.map((r) => {
    const { custom_fields, ...rest } = r as Record<string, unknown> & { custom_fields?: Values };
    const out: Record<string, unknown> = { ...rest };
    for (const f of fields) out[f.label] = displayValue(f, (custom_fields ?? {})[f.name]);
    return out;
  });
}

// ---- list filters (the server reads cf_<name>, cf_<name>_min, cf_<name>_max) ------------------------------------
export type CustomFilter = { name: string; value?: string; min?: string; max?: string };

export function filterParams(filters: CustomFilter[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of filters) {
    if (f.value) out[`cf_${f.name}`] = f.value;
    if (f.min) out[`cf_${f.name}_min`] = f.min;
    if (f.max) out[`cf_${f.name}_max`] = f.max;
  }
  return out;
}

export function describeFilter(field: CustomField | undefined, f: CustomFilter): string {
  const label = field?.label ?? f.name;
  if (f.value === "__empty__") return `${label} is empty`;
  if (f.value === "__any__") return `${label} has a value`;
  const parts: string[] = [];
  if (f.value) {
    const v = field && SELECT_TYPES.has(field.field_type) ? f.value.split(",").map((x) => field.options.find((o) => o.value === x)?.label ?? x).join(" or ")
      : field?.field_type === "checkbox" ? (f.value === "true" ? "Yes" : "No") : f.value;
    parts.push(field && (field.field_type === "text" || field.field_type === "long_text" || field.field_type === "email" || field.field_type === "url" || field.field_type === "phone") ? `${label} contains "${v}"` : `${label} is ${v}`);
  }
  if (f.min) parts.push(`${label} from ${f.min}`);
  if (f.max) parts.push(`${label} to ${f.max}`);
  return parts.join(", ");
}
