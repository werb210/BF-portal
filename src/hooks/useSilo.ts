// BF_PORTAL_BLOCK_BI_SILO_SYNC_v1
// Single path: always go through BusinessUnitContext. The legacy
// SiloContext is now a facade over the same store, so either entry
// point lands on the canonical state.
import { useContext } from "react";
import SiloContext from "@/context/SiloContext";

export const useSilo = () => {
  const ctx = useContext(SiloContext);
  if (!ctx) throw new Error("SiloProvider missing");
  return ctx;
};
