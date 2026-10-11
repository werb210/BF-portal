import { useEffect, useMemo, useState } from "react";
import { apiForSilo } from "@/api";

// BF_PORTAL_GLOBAL_ADMIN_v784 - the counts called /admin/applications and
// /deals, which do not exist on any server, and one failure blanked them all.
// Each source now loads independently; a failed one reads "unavailable".
type Count = number | "unavailable" | null;

type CountState = {
  bfApplications: Count;
  biApplications: Count;
  slfDeals: Count;
};

function countOf(res: unknown): number {
  if (Array.isArray(res)) return res.length;
  const obj = (res ?? {}) as Record<string, unknown>;
  for (const key of ["total", "count"]) {
    if (typeof obj[key] === "number") return obj[key] as number;
  }
  for (const key of ["items", "applications", "deals", "data", "rows"]) {
    if (Array.isArray(obj[key])) return (obj[key] as unknown[]).length;
  }
  return 0;
}

function show(value: Count): string {
  if (value === null) return "Loading...";
  return String(value);
}

export default function GlobalAdmin() {
  const bfApi = useMemo(() => apiForSilo("BF"), []);
  const biApi = useMemo(() => apiForSilo("BI"), []);
  const slfApi = useMemo(() => apiForSilo("SLF"), []);
  const [counts, setCounts] = useState<CountState>({ bfApplications: null, biApplications: null, slfDeals: null });

  useEffect(() => {
    let alive = true;
    const load = (key: keyof CountState, request: () => Promise<unknown>) => {
      request()
        .then((res) => {
          if (alive) setCounts((prev) => ({ ...prev, [key]: countOf(res) }));
        })
        .catch(() => {
          if (alive) setCounts((prev) => ({ ...prev, [key]: "unavailable" }));
        });
    };
    load("bfApplications", () => bfApi.get("/api/portal/applications"));
    load("biApplications", () => biApi.get("/api/v1/bi/applications"));
    load("slfDeals", () => slfApi.get("/api/slf/deals"));
    return () => {
      alive = false;
    };
  }, [bfApi, biApi, slfApi]);

  return (
    <div>
      <h2>Global Admin Dashboard</h2>
      <ul>
        <li>BI applications count: {show(counts.biApplications)}</li>
        <li>SLF deal count: {show(counts.slfDeals)}</li>
        <li>BF applications count: {show(counts.bfApplications)}</li>
      </ul>
    </div>
  );
}
