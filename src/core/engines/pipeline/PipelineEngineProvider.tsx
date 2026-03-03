import { createContext, ReactNode } from "react";
import type { PipelineEngineConfig } from "./pipeline.config";

export const PipelineEngineContext =
  createContext<PipelineEngineConfig | null>(null);

export const PipelineEngineProvider = ({
  config,
  children,
}: {
  config: PipelineEngineConfig;
  children: ReactNode;
}) => {
  return (
    <PipelineEngineContext.Provider value={config}>
      {children}
    </PipelineEngineContext.Provider>
  );
};
