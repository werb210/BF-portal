import { useCallback, useEffect, useMemo, useState } from "react";
import { useSilo } from "../../context/SiloContext";
import { useAuth } from "../../auth/AuthContext";
import { createApi } from "../../api/apiFactory";
import type { SLFDeal } from "../../types/slf";
import { usePolling } from "../../hooks/usePolling";
import Skeleton from "../../components/Skeleton";

type SLFDealDetail = {
  id: string;
  external_id?: string;
  created_at?: string;
  updated_at?: string;
  status_history?: { status: string; at: string }[];
  logs?: { id?: string; message?: string; created_at?: string }[];
};

export default function SLFPipeline() {
  const { silo } = useSilo();
  const { token } = useAuth();
  const api = useMemo(() => createApi(silo, token ?? ""), [silo, token]);

  const [deals, setDeals] = useState<SLFDeal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<SLFDealDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDeals = useCallback(async () => {
    const res = await api.get<SLFDeal[]>("/deals");
    setDeals(res.data);
    setIsLoading(false);
  }, [api]);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  usePolling(() => {
    void loadDeals();
  });

  async function updateStatus(id: string, status: SLFDeal["status"]) {
    await api.patch(`/slf/deals/${id}/status`, { status });
    await loadDeals();
  }

  async function openDeal(id: string) {
    const response = await api.get<SLFDealDetail>(`/slf/deals/${id}`);
    setSelectedDeal(response.data);
  }

  const columns: SLFDeal["status"][] = ["received", "processing", "completed"];

  return (
    <div>
      <div style={{ display: "flex", gap: 20 }}>
        {columns.map((col) => (
          <div key={col} style={{ flex: 1 }}>
            <h3>{col.toUpperCase()}</h3>
            {isLoading ? (
              <Skeleton count={3} height={90} />
            ) : (
              deals
                .filter((d) => d.status === col)
                .map((deal) => (
                  <div
                    key={deal.id}
                    style={{
                      background: "#0f172a",
                      padding: 12,
                      marginBottom: 10,
                      borderRadius: 6
                    }}
                  >
                    <button onClick={() => openDeal(deal.id)} style={{ display: "block", marginBottom: 6 }}>
                      <strong>{deal.external_id}</strong>
                    </button>
                    <div>{deal.product_family}</div>
                    <button onClick={() => updateStatus(deal.id, "processing")}>Move to Processing</button>
                    <button onClick={() => updateStatus(deal.id, "completed")}>Complete</button>
                  </div>
                ))
            )}
          </div>
        ))}
      </div>

      {selectedDeal ? (
        <aside style={{ marginTop: 16, border: "1px solid #334155", borderRadius: 8, padding: 12 }}>
          <h3>Deal Detail</h3>
          <p>External ID: {selectedDeal.external_id ?? "-"}</p>
          <p>Created at: {selectedDeal.created_at ?? "-"}</p>
          <p>Last updated: {selectedDeal.updated_at ?? "-"}</p>

          <h4>Status history</h4>
          <ul>
            {(selectedDeal.status_history ?? []).map((item, index) => (
              <li key={`${item.at}-${index}`}>
                {item.status} at {item.at}
              </li>
            ))}
          </ul>

          <h4>Logs</h4>
          <ul>
            {(selectedDeal.logs ?? []).map((log, index) => (
              <li key={log.id ?? `${log.created_at ?? "log"}-${index}`}>
                {log.created_at ?? "-"}: {log.message ?? "-"}
              </li>
            ))}
          </ul>
          <button onClick={() => setSelectedDeal(null)}>Close</button>
        </aside>
      ) : null}
    </div>
  );
}
