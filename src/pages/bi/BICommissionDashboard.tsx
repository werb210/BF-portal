import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSilo } from "../../context/SiloContext";
import { createApi } from "../../api/apiFactory";
import { useAuth } from "../../auth/AuthContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { usePolling } from "../../hooks/usePolling";
import Skeleton from "../../components/Skeleton";

interface CommissionDatum {
  name: string;
  commission: number;
  policyId: string;
}

interface CommissionResponse {
  application_id: string;
  commission_amount?: string | number | null;
}

export default function BICommissionDashboard() {
  const { silo } = useSilo();
  const { token } = useAuth();
  const api = useMemo(() => createApi(silo, token ?? ""), [silo, token]);

  const [data, setData] = useState<CommissionDatum[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await api.get<CommissionResponse[]>("/admin/commissions");

    const grouped = response.data.map((c) => ({
      name: c.application_id.slice(0, 6),
      commission: Number(c.commission_amount || 0),
      policyId: c.application_id
    }));

    setData(grouped);
    setIsLoading(false);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  usePolling(() => {
    void load();
  });

  if (isLoading) {
    return (
      <div style={{ width: "100%", height: 400 }}>
        <h2>Recurring Commission Overview</h2>
        <Skeleton height={320} />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 400 }}>
      <h2>Recurring Commission Overview</h2>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="#444" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="commission" fill="#00bcd4" />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 12 }}>
        <h3>Policies</h3>
        <ul>
          {data.map((item) => (
            <li key={item.policyId}>
              <Link to={`/bi/commissions/${item.policyId}`}>{item.policyId}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
