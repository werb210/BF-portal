import AwaitingBackendPanel from "./AwaitingBackendPanel";

export default function NotesTab() {
  return (
    <AwaitingBackendPanel
      tab="Notes"
      description="Awaiting backend wiring (Block 23)."
      expectedShape={JSON.stringify({ tab: "Notes", status: "awaiting_backend_wiring_block_23" }, null, 2)}
    />
  );
}
