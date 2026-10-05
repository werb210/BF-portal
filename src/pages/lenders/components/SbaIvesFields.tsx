// BF_PORTAL_LENDER_SBA_IVES_v747
// "Do you offer SBA loans?" and, if yes, the lender's IVES details. IRS Form 4506-C (line 5a) names the
// lender's IVES participant so the lender can pull the applicant's tax transcripts; with these on file the
// applicant signs a 4506-C for each SBA lender in the same signing as the rest of the file.
// Used by the staff Edit Lender form and the lender's own portal profile.
import { Field, inputStyle } from "./lenderFieldShared";

export type LenderSba = {
  offersSba: boolean | null;
  ivesParticipantName: string;
  ivesParticipantId: string;
  ivesSorMailboxId: string;
  ivesStreet: string;
  ivesCity: string;
  ivesState: string;
  ivesZip: string;
};

export const EMPTY_SBA: LenderSba = {
  offersSba: null, ivesParticipantName: "", ivesParticipantId: "", ivesSorMailboxId: "",
  ivesStreet: "", ivesCity: "", ivesState: "", ivesZip: "",
};

/** The fields a lender offering SBA still has to fill in (empty when complete or not offering SBA). */
export function sbaMissing(v: LenderSba): string[] {
  if (v.offersSba !== true) return [];
  const out: string[] = [];
  if (!v.ivesParticipantName.trim()) out.push("IVES participant name");
  if (!v.ivesParticipantId.trim()) out.push("IVES participant ID");
  if (!v.ivesSorMailboxId.trim()) out.push("SOR mailbox ID");
  return out;
}

export default function SbaIvesFields({ value, onChange }: { value: LenderSba; onChange: (next: LenderSba) => void }) {
  const set = (key: keyof LenderSba, v: string) => onChange({ ...value, [key]: v });
  const missing = sbaMissing(value);
  return (
    <div data-testid="lender-sba-section" style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 16 }}>
      <Field label="Do you offer SBA loans?">
        <select
          aria-label="Do you offer SBA loans?"
          value={value.offersSba === true ? "yes" : value.offersSba === false ? "no" : ""}
          onChange={(e) => onChange({ ...value, offersSba: e.target.value === "yes" ? true : e.target.value === "no" ? false : null })}
          style={inputStyle}
        >
          <option value="">Select...</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </Field>
      {value.offersSba === true && (
        <>
          <div style={{ fontSize: 13, color: "#334155", margin: "4px 0 12px" }}>
            Your IVES details go on IRS Form 4506-C so you can pull the applicant's tax transcripts. You'll find them in your IVES enrollment with the IRS.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="IVES participant name *"><input aria-label="IVES participant name" value={value.ivesParticipantName} onChange={(e) => set("ivesParticipantName", e.target.value)} style={inputStyle} /></Field>
            <Field label="IVES participant ID *"><input aria-label="IVES participant ID" value={value.ivesParticipantId} onChange={(e) => set("ivesParticipantId", e.target.value)} style={inputStyle} /></Field>
            <Field label="SOR mailbox ID *"><input aria-label="SOR mailbox ID" value={value.ivesSorMailboxId} onChange={(e) => set("ivesSorMailboxId", e.target.value)} style={inputStyle} /></Field>
            <Field label="IVES street address"><input aria-label="IVES street address" value={value.ivesStreet} onChange={(e) => set("ivesStreet", e.target.value)} style={inputStyle} /></Field>
            <Field label="City"><input aria-label="IVES city" value={value.ivesCity} onChange={(e) => set("ivesCity", e.target.value)} style={inputStyle} /></Field>
            <Field label="State"><input aria-label="IVES state" value={value.ivesState} onChange={(e) => set("ivesState", e.target.value)} style={inputStyle} /></Field>
            <Field label="ZIP"><input aria-label="IVES ZIP" value={value.ivesZip} onChange={(e) => set("ivesZip", e.target.value)} style={inputStyle} /></Field>
          </div>
          {missing.length > 0 && <div role="alert" style={{ color: "#991b1b", fontSize: 13, marginTop: 4 }}>Still needed: {missing.join(", ")}.</div>}
        </>
      )}
    </div>
  );
}
