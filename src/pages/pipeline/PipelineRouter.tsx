// BF_PORTAL_BLOCK_v213_CANONICAL_BI_PIPELINE_REDIRECT_v1
// The BI silo nav (AppLayout.tsx BI_NAV) links Pipeline to
// /silo/bi/pipeline, which renders the engine-based pipeline via
// biPipelineAdapter + BI_STAGES. The legacy BIPipelinePage path
// (this file's original target) is orphan code from before v200.
// For BI users we redirect /pipeline to /silo/bi/pipeline so the
// BI silo has ONE canonical pipeline; BF + SLF keep using PipelinePage.
import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import PipelinePage from "@/pages/pipeline/PipelinePage";
import CustomPipelineBoard from "@/pipelines/CustomPipelineBoard"; // BF_PORTAL_v870_CRM_DATA_MODEL
import { LENDING_ID, usePipelines } from "@/pipelines/pipelinesApi"; // BF_PORTAL_v870_CRM_DATA_MODEL
import SLFView from "@/silos/slf/SLFView"; // BF_PORTAL_SLF_PIPELINE_ROUTE_v1
import { useBusinessUnit } from "@/context/BusinessUnitContext";

export default function PipelineRouter() {
  const { activeBusinessUnit } = useBusinessUnit();
  if (activeBusinessUnit === "BI") {
    return <Navigate to="/silo/bi/pipeline" replace />;
  }
  // BF_PORTAL_SLF_PIPELINE_ROUTE_v1 - SLF used to fall through to PipelinePage,
  // which reads BF applications from BF-Server, so selecting the SLF silo showed
  // BF deals. SLF data is a read-only mirror served by slf-server under
  // /api/slf/*; SLFView is the component that reads it.
  if (activeBusinessUnit === "SLF") {
    return <SLFView />;
  }
  return <BfPipelines />;
}

// BF_PORTAL_v870_CRM_DATA_MODEL - once an Admin adds an extra pipeline (Settings > Pipelines), a picker above the board:
// Lending shows the lending board exactly as before; any other pipeline shows its own board. With no extra pipeline
// nothing changes.
function BfPipelines() {
  const [reload, setReload] = useState(0);
  const list = usePipelines(reload);
  const [params, setParams] = useSearchParams();
  const extra = (list?.pipelines ?? []).filter((p) => !p.system && !p.archived_at);
  const wanted = params.get("pipeline") ?? LENDING_ID;
  const current = extra.find((p) => p.id === wanted) ?? null;
  if (!list || extra.length === 0) return <PipelinePage />;
  const pick = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === LENDING_ID) next.delete("pipeline");
    else next.set("pipeline", id);
    setParams(next, { replace: true });
  };
  return (
    <div>
      <div role="tablist" aria-label="Pipelines" style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "8px 16px 4px" }}>
        {[{ id: LENDING_ID, name: "Lending" }, ...extra].map((p) => {
          const active = (current?.id ?? LENDING_ID) === p.id;
          return (
            <button key={p.id} type="button" role="tab" aria-selected={active} onClick={() => pick(p.id)}
              className={active ? "ui-button ui-button--primary" : "ui-button ui-button--secondary"}>{p.name}</button>
          );
        })}
      </div>
      {current
        ? <div style={{ padding: 16 }}><h1 style={{ fontSize: 20, margin: "0 0 12px", color: "var(--ui-text)" }}>{current.name}</h1><CustomPipelineBoard pipeline={current} all={list.pipelines} onChanged={() => setReload((n) => n + 1)} /></div>
        : <PipelinePage />}
    </div>
  );
}
