// BI_PIPELINE_ALIGN_v57 — PGI webhook data.
import type { BiApplicationDetailData } from "../BIApplicationDetail";
export default function InsurerResponseTab({ app }: { app: BiApplicationDetailData }) {
  const r = (app.insurer_response ?? {}) as Record<string, unknown>;
  return <pre className="max-h-80 overflow-auto rounded bg-black/40 p-3 text-xs">{JSON.stringify(r, null, 2)}</pre>;
}
