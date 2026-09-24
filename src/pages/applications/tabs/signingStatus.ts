// BF_PORTAL_BLOCK_v460_SIGNING_STARTED
// The first Send on an unsigned application does not send a package: it sends the
// applicant the signing request (orchestrator stage A). Once they sign, BF-Server
// queues the package to the finalized lenders by itself. That is progress, not a
// failure, so it gets its own message instead of a red "Not sent".
type Orchestrator = { stageA?: { fired?: boolean; reason?: string }; stageB?: { fired?: boolean; reason?: string } };

export function signingNotice(payload: unknown, lenderCount: number): string | null {
  const orch = (payload as { orchestrator?: Orchestrator } | null)?.orchestrator;
  if (!orch || orch.stageB?.fired === true) return null;
  const lenders = `${lenderCount === 1 ? "the selected lender" : "the selected lenders"}`;
  if (orch.stageA?.fired === true) {
    return `Signing request sent to the applicant. The package goes to ${lenders} automatically once they sign.`;
  }
  if (orch.stageA?.reason === "already_started" && orch.stageB?.reason === "not_ready") {
    return `Waiting for the applicant to sign. The package goes to ${lenders} automatically once they sign.`;
  }
  return null;
}
