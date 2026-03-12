import { useEffect, useMemo, useState } from "react";
import { createApi } from "../api/apiFactory";
import { useAuth } from "../auth/AuthContext";

type CountState = {
  bfApplications: number;
  biApplications: number;
  slfDeals: number;
};

export default function GlobalAdmin() {
  const { token } = useAuth();
  const bfApi = useMemo(() => createApi("bf", token ?? ""), [token]);
  const biApi = useMemo(() => createApi("bi", token ?? ""), [token]);
  const slfApi = useMemo(() => createApi("slf", token ?? ""), [token]);
  const [counts, setCounts] = useState<CountState>({ bfApplications: 0, biApplications: 0, slfDeals: 0 });

  useEffect(() => {
    async function loadCounts() {
      const [bfApps, biApps, slfDeals] = await Promise.all([
        bfApi.get<unknown[]>("/admin/applications"),
        biApi.get<unknown[]>("/admin/applications"),
        slfApi.get<unknown[]>("/deals")
      ]);

      setCounts({
        bfApplications: bfApps.data.length,
        biApplications: biApps.data.length,
        slfDeals: slfDeals.data.length
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
