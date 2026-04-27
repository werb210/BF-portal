import AwaitingBackendPanel from "./AwaitingBackendPanel";

export default function DocumentsTab() {
  return (
    <AwaitingBackendPanel
      tab="Documents"
      description="Awaiting backend wiring (Block 23)."
      expectedShape={JSON.stringify({ tab: "Documents", status: "awaiting_backend_wiring_block_23" }, null, 2)}
    />
  );
}
