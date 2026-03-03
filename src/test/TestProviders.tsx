import React from "react";
import { SiloProvider } from "@/core/SiloContext";

export function TestProviders({ children }: { children: React.ReactNode }) {
  return <SiloProvider forcedSilo="BF">{children}</SiloProvider>;
}
