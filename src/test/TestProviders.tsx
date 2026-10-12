import React from "react";
// BF_PORTAL_v789_DEAD_CODE - the real SiloContext (core/SiloContext.tsx was a second, unused copy).
import { SiloProvider } from "@/context/SiloContext";
import BusinessUnitContext from "@/context/BusinessUnitContext";
import type { BusinessUnit } from "@/types/businessUnit";

export function TestProviders({ children, silo = "BF" }: { children: React.ReactNode; silo?: BusinessUnit }) {
  return (
    <BusinessUnitContext.Provider value={{ activeBusinessUnit: silo, businessUnits: [silo], setActiveBusinessUnit: () => undefined }}>
      <SiloProvider>{children}</SiloProvider>
    </BusinessUnitContext.Provider>
  );
}
