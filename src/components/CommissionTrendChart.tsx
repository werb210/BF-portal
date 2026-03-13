import { useEffect, useState } from "react";
import { withApiBase } from "@/lib/apiBase";

interface TrendData {
  date: string;
  commission: number;
}

export default function CommissionTrendChart() {
  const [data, setData] = useState<TrendData[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("boreal_staff_token");

    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(withApiBase("/api/analytics/commission-trend"), {
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
