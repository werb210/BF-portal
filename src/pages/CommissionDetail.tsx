import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { createApi } from "../api/apiFactory";
import { useAuth } from "../auth/AuthContext";
import Skeleton from "../components/Skeleton";

type PremiumRow = {
  period?: string;
  amount?: number;
  paid?: boolean;
};

type LedgerEntry = {
  id?: string;
  amount?: number;
  status?: string;
  created_at?: string;
};

type CommissionDetailResponse = {
  policy_number?: string;
  premium_rows?: PremiumRow[];
  ledger_entries?: LedgerEntry[];
};

export default function CommissionDetail() {
  const { policyId } = useParams<{ policyId: string }>();
  const { token } = useAuth();
  const biApi = useMemo(() => createApi("bi", token ?? ""), [token]);
  const [detail, setDetail] = useState<CommissionDetailResponse | null>(null);

  useEffect(() => {
    async function load() {
      if (!policyId) return;
      const response = await biApi.get<CommissionDetailResponse>(`/bi/admin/commissions/${policyId}`);
      setDetail(response.data);
    }

    void load();
  }, [biApi, policyId]);

  if (!detail) {
    return (
      <div>
        <h2>Commission Detail</h2>
        <Skeleton count={6} height={24} />
      </div>
    );
  }

  const premiumRows = detail.premium_rows ?? [];
  const paidCount = premiumRows.filter((row) => row.paid).length;
  const unpaidCount = premiumRows.length - paidCount;

  return (
    <div>
      <h2>Commission Detail</h2>
      <p>Policy number: {detail.policy_number ?? policyId}</p>
      <p>
        Paid vs unpaid: {paidCount} paid / {unpaidCount} unpaid
      </p>

      <h3>Premium Rows</h3>
      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {premiumRows.map((row, index) => (
            <tr key={`${row.period ?? "period"}-${index}`}>
              <td>{row.period ?? "-"}</td>
              <td>{row.amount ?? 0}</td>
              <td>{row.paid ? "Paid" : "Unpaid"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Ledger Entries</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Created at</th>
          </tr>
        </thead>
        <tbody>
          {(detail.ledger_entries ?? []).map((entry, index) => (
            <tr key={entry.id ?? `${entry.created_at ?? "entry"}-${index}`}>
              <td>{entry.id ?? "-"}</td>
              <td>{entry.amount ?? 0}</td>
              <td>{entry.status ?? "-"}</td>
              <td>{entry.created_at ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
