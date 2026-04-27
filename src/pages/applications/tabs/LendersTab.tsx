import AwaitingBackendPanel from "./AwaitingBackendPanel";

export default function LendersTab() {
  return (
    <AwaitingBackendPanel
      tab="Lenders"
      description="Awaiting backend wiring (Block 23)."
      expectedShape={JSON.stringify({ tab: "Lenders", status: "awaiting_backend_wiring_block_23" }, null, 2)}
    />
  );
}
