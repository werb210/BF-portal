// BF_PORTAL_BLOCK_BI_SILO_SYNC_v1
// Legacy SiloContext used to hold its own React state ("bf"|"bi"|"slf"),
// independent of BusinessUnitContext. That created a split-brain: the
// dropdown wrote here, sessionStorage was driven by BusinessUnitContext,
// resolveApiBase() read sessionStorage. BI silo selection never reached
// API routing → all calls went to BF-Server.
//
// Now: SiloProvider is a thin pass-through over useBusinessUnit. The
// stored silo is uppercase BusinessUnit; the "silo" surface remains
// lowercase for the legacy callers that expect "bf"|"bi"|"slf".
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useBusinessUnit } from "@/hooks/useBusinessUnit";
import type { BusinessUnit } from "@/types/businessUnit";
import type { Silo } from "../types/silo";

interface SiloContextType {
  silo: Silo;
  setSilo: (s: Silo | BusinessUnit) => void;
}

const businessUnitToSilo = (bu: BusinessUnit): Silo =>
  bu.toLowerCase() as Silo;

const siloOrBusinessUnitToBusinessUnit = (input: Silo | BusinessUnit): BusinessUnit => {
  const upper = String(input).toUpperCase();
  if (upper === "BF" || upper === "BI" || upper === "SLF") {
    return upper as BusinessUnit;
  }
  return "BF";
};

const SiloContext = createContext<SiloContextType | undefined>(undefined);

export function SiloProvider({ children }: { children: ReactNode }) {
  const { activeBusinessUnit, setActiveBusinessUnit } = useBusinessUnit();

  const value = useMemo<SiloContextType>(
    () => ({
      silo: businessUnitToSilo(activeBusinessUnit),
      setSilo: (s) => setActiveBusinessUnit(siloOrBusinessUnitToBusinessUnit(s)),
    }),
    [activeBusinessUnit, setActiveBusinessUnit],
  );

  return <SiloContext.Provider value={value}>{children}</SiloContext.Provider>;
}

export function useSilo() {
  const ctx = useContext(SiloContext);
  if (!ctx) throw new Error("SiloProvider missing");
  return ctx;
}

export default SiloContext;
export type { SiloContextType };
