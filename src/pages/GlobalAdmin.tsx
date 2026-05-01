import { useEffect, useMemo, useState } from "react";
import { apiForSilo } from "@/api";
import { useAuth } from "../auth/AuthContext";

type CountState = {
  bfApplications: number;
  biApplications: number;
  slfDeals: number;
};

export default function GlobalAdmin() {
  const { token } = useAuth();
  const bfApi = useMemo(() => apiForSilo("BF"), []);
  const biApi = useMemo(() => apiForSilo("BI"), []);
  const slfApi = useMemo(() => apiForSilo("SLF"), []);
  const [counts, setCounts] = useState<CountState>({ bfApplications: 0, biApplications: 0, slfDeals: 0 });

  useEffect(() => {
    async function loadCounts() {
      const [bfApps, biApps, slfDeals] = await Promise.all([
        bfApi.get<unknown[]>("/admin/applications"),
        biApi.get<unknown[]>("/admin/applications"),
        slfApi.get<unknown[]>("/deals")
      ]);

      setCounts({
        bfApplications: bfApps.length,
        biApplications: biApps.length,
        slfDeals: slfDeals.length
      });
    }

    void loadCounts();
  }, [bfApi, biApi, slfApi]);

  return (
    <div>
      <h2>Global Admin Dashboard</h2>
      <ul>
        <li>BI applications count: {counts.biApplications}</li>
        <li>SLF deal count: {counts.slfDeals}</li>
        <li>BF applications count: {counts.bfApplications}</li>
      </ul>
    </div>
  );
}
