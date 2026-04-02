import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

interface TrendData {
  date: string;
  commission: number;
}

export default function CommissionTrendChart() {
  const [data, setData] = useState<TrendData[]>([]);

  useEffect(() => {
    apiClient<TrendData[]>("/analytics/commission-trend")
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
