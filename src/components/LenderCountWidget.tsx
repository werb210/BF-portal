import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function LenderCountWidget() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    api<{ count?: number }>("/public/lender-count")
      .then((data) => setCount(data.count ?? 0))
      .catch(() => setCount(0));
  }, []);

  return <div>Active Lenders: {count}</div>;
}
