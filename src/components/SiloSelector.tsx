import { useNavigate } from "react-router-dom";
import { useSilo } from "../context/SiloContext";
import { useAuth } from "../auth/AuthContext";
import { SILOS } from "../types/silo";
import type { Silo } from "../types/silo";

const siloLabels: Record<Silo, string> = {
  bf: "BF",
  bi: "BI",
  slf: "SLF",
  admin: "Admin",
};

export default function SiloSelector() {
  const { silo, setSilo } = useSilo();
  const { canAccessSilo } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", gap: 12 }}>
      {SILOS.map((s) => (
        <button
          key={s}
          onClick={() => {
            if (!canAccessSilo(s)) return;
            setSilo(s);
            navigate(`/${s}`);
          }}
          disabled={silo === s}
        >
          {siloLabels[s]}
        </button>
      ))}
    </div>
  );
}
