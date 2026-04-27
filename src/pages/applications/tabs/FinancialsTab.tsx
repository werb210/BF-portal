import AwaitingBackendPanel from "./AwaitingBackendPanel";

export default function FinancialsTab() {
  return (
    <AwaitingBackendPanel
      tab="Financials"
      description="Awaiting backend wiring (Block 23)."
      expectedShape={JSON.stringify({ tab: "Financials", status: "awaiting_backend_wiring_block_23" }, null, 2)}
    />
  );
}
