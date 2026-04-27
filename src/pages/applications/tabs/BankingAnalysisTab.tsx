import AwaitingBackendPanel from "./AwaitingBackendPanel";

export default function BankingAnalysisTab() {
  return (
    <AwaitingBackendPanel
      tab="BankingAnalysis"
      description="Awaiting backend wiring (Block 23)."
      expectedShape={JSON.stringify({ tab: "BankingAnalysis", status: "awaiting_backend_wiring_block_23" }, null, 2)}
    />
  );
}
