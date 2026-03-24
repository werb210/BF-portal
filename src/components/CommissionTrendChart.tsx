import { useEffect, useState } from "react";
import { buildUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface TrendData {
  date: string;
  commission: number;
}

export default function CommissionTrendChart() {
  const [data, setData] = useState<TrendData[]>([]);

  useEffect(() => {
    const token = getToken();

    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch (buildUrl("/api" + "/analytics/commission-trend"), {
      headers,
    })
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return (
    <div>
      {data.map((item) => (
        <div key={item.date}>
          {item.date}: ${item.commission}
        </div>
      ))}
    </div>
  );
}
