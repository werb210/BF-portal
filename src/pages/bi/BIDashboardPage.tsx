import { useEffect } from "react";
import { useSilo } from "@/hooks/useSilo";
import type { Silo } from "@/types/silo";

const BIDashboardPage = () => {
  const { silo, setSilo } = useSilo() as { silo: Silo; setSilo: (next: Silo) => void };

  useEffect(() => {
    if (silo !== "bi") {
      setSilo("bi");
    }
  }, [setSilo, silo]);

  if (silo !== "bi") return null;

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">BI Dashboard</h1>
      <p className="text-sm text-text-secondary">Boreal Insurance staff dashboard.</p>
    </div>
  );
};

export default BIDashboardPage;
