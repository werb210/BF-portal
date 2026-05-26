// BF_PORTAL_BLOCK_v634_TEST2_FIX_PACK_v1
// @deprecated This placeholder component is NOT what production renders.
// The real pipeline kanban card is at src/core/engines/pipeline/PipelineCard.tsx
// and includes business name, product category, amount, stage, doc warning,
// processing status, and credit summary. This file existed as an early
// stub with hardcoded document/notes placeholder copy which would
// silently break the pipeline UI if imported by mistake. The export is
// preserved as a throwing component so any accidental import surfaces
// loudly at render time instead of silently displaying wrong data.
export default function ApplicationCard(): never {
  throw new Error(
    "ApplicationCard is deprecated. Use PipelineCard from " +
    "src/core/engines/pipeline/PipelineCard.tsx instead."
  );
}
