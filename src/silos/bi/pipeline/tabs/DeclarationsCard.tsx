// BF_PORTAL_BLOCK_v629_BI_PURBECK_RENDER_v1
import React from "react";

// BF_PORTAL_BLOCK_v632_CARRIER_CORRECTIONS_v1
// Authoritative wording from Craig's corrected changelog 2026-05-25.
// Section numbers prefixed for staff cross-reference to Purbeck spec; the
// short label captures the actual question topic, not the old inferred one.
const SECTION_LABELS: Record<string, string> = {
  section_1_a: "1.a — Physical-asset insurance in force?",
  section_1_2: "1.2 — Personal bankruptcy ever declared?",
  section_2_a: "2.a — Ever barred / under investigation as Director?",
  section_2_b: "2.b — Director of an insolvent company (history)?",
  section_2_c: "2.c — Director of a CRA/CBSA investigation target?",
  section_2_d: "2.d — Liability not payable within 30 days?",
  section_3_a: "3.a — Material bad debts owed to the business?",
  section_3_c: "3.c — Truthfulness oath (Agree/Disagree)",
  section_4_a: "4.a — Lost key investor/customer/supplier (last 6mo)?",
  section_5_a: "5.a — Risks to obligations next 6 months?",
  section_6_a: "6.a — Company solvent today?",
};

const ADVERSE_YES = new Set([
  "section_1_2", "section_2_a", "section_2_b", "section_2_c", "section_2_d",
  "section_3_a", "section_4_a", "section_5_a",
]);

export function DeclarationsCard({ declarations }: { declarations: Record<string, unknown> }) {
  const keys = Object.keys(SECTION_LABELS);
  const anyAdverse = keys.some((k) => {
    if (k === "section_3_c") return declarations[k] === "Disagree";
    return ADVERSE_YES.has(k) && declarations[k] === "yes";
  });
  return (
    <section className="rounded border border-gray-200 p-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Declarations</h3>
        {anyAdverse && <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">Adverse answers present</span>}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {keys.map((k) => {
            const answer = declarations[k];
            const reasonKey = `${k}_reason`;
            const reason = declarations[reasonKey];
            const isAdverse = k === "section_3_c"
              ? answer === "Disagree"
              : ADVERSE_YES.has(k) && answer === "yes";
            const answerDisplay = answer == null || answer === "" ? <span className="text-gray-400">—</span> : String(answer);
            return (
              <React.Fragment key={k}>
                <tr className="border-t border-gray-100">
                  <td className="py-1 pr-2 text-gray-600">{SECTION_LABELS[k]}</td>
                  <td className={`py-1 text-right font-medium ${isAdverse ? "text-amber-700" : ""}`}>{answerDisplay}</td>
                </tr>
                {isAdverse && (
                  <tr>
                    <td colSpan={2} className="pb-2 pl-4 pr-2 text-xs text-gray-700 italic">
                      {typeof reason === "string" && reason.trim() ? `"${reason}"` : <span className="text-red-500">No reason provided (required)</span>}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
