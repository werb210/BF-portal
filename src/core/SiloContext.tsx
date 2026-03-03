import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { getSiloFromHost, type Silo } from "./silo";

const SiloContext = createContext<Silo>("BF");

export function SiloProvider({ children }: { children: ReactNode }) {
  const silo = getSiloFromHost();

  return <SiloContext.Provider value={silo}>{children}</SiloContext.Provider>;
}

export function useSilo() {
  return useContext(SiloContext);
}
