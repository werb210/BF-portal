// BF_PORTAL_v945_KS_OUTREACH - reads a brokerage list file (.xlsx or .csv, as the ZoomInfo exports come) into the rows
// KS-Ops imports. Column headers are matched by name, in any order; unknown columns are ignored.
const HEADERS: Record<string, string[]> = {
  country: ["country"], company: ["company", "company name", "brokerage"], contact_name: ["contact name", "name", "full name", "contact"],
  title: ["title", "job title"], person_id: ["zoominfo person id", "person id"], company_id: ["zoominfo company id", "company id"],
  email: ["business email", "email", "email address"], direct_phone: ["direct or company phone", "direct phone", "company phone", "phone"],
  mobile_phone: ["mobile phone", "mobile"], website: ["website", "company website", "url"], qualification_status: ["qualification status", "qualification"],
  verification_url: ["verification url", "source url"], direct_dnc: ["direct phone do not call"], mobile_dnc: ["mobile do not call"],
  employee_count: ["employee count", "employees", "number of employees", "staff"], address_line1: ["address", "street", "address line 1", "mailing address", "street address"],
  address_line2: ["address line 2", "suite"], city: ["city"], province_state: ["province or state", "province/state", "province", "state", "region"],
  postal_code: ["postal code", "zip", "zip code", "postal/zip"], technologies: ["technologies", "technologies in use", "tech stack", "current tools"],
  products: ["products", "financing products"], firm_type: ["firm type"],
};
const norm = (h: unknown) => String(h ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const LOOKUP = new Map<string, string>(Object.entries(HEADERS).flatMap(([key, names]) => names.map((n) => [n, key] as [string, string])));

/** CSV with quoted cells, doubled quotes and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export type ListRows = { rows: Array<Record<string, string>>; columns: string[]; unknown: string[]; error?: string };

/** Turns a header row plus data rows into import rows. Needs at least a company column. */
export function toImportRows(grid: unknown[][]): ListRows {
  const head = (grid[0] ?? []).map(norm);
  const keys = head.map((h) => LOOKUP.get(h) ?? null);
  const columns = keys.filter((k): k is string => !!k);
  const unknown = head.filter((h, i) => h && !keys[i]);
  if (!columns.includes("company")) return { rows: [], columns, unknown, error: 'The file needs a "Company" column in its first row.' };
  const rows: Array<Record<string, string>> = [];
  for (const line of grid.slice(1)) {
    const r: Record<string, string> = {};
    keys.forEach((k, i) => {
      const v = String(line[i] ?? "").trim();
      if (k && v && v.toLowerCase() !== "nan" && r[k] === undefined) r[k] = v;
    });
    if (r.company) rows.push(r);
  }
  return { rows, columns, unknown };
}

export async function readListFile(file: File): Promise<ListRows> {
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") return toImportRows(parseCsv(await file.text()));
  if (/\.xlsx$/i.test(file.name)) {
    const { default: readXlsxFile } = await import("read-excel-file");
    return toImportRows((await readXlsxFile(file)) as unknown[][]);
  }
  return { rows: [], columns: [], unknown: [], error: "Choose an Excel (.xlsx) or CSV file." };
}
