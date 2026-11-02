// BF_PORTAL_v874_MARKETING_TOOLS - the email campaign send options (ported from KS-Portal #42 without the Marketing
// add-on or the campaign email allowance): a subject-line A/B test (a sample gets subject A or B, the one opened more
// goes to everyone else) or sending at each person's best time (kept between 09:00 and 20:00 Alberta time).
import type { CSSProperties } from "react";

export type SendOptions = { ab: boolean; subjectB: string; testPercent: number; waitHours: number; bestTime: boolean };
export const DEFAULT_SEND_OPTIONS: SendOptions = { ab: false, subjectB: "", testPercent: 20, waitHours: 4, bestTime: false };

/** The fields the send route takes for these options (nothing when neither is on). */
export function sendOptionsPayload(o: SendOptions): Record<string, unknown> {
  if (o.ab && o.subjectB.trim()) return { abTest: { subjectB: o.subjectB.trim(), testPercent: o.testPercent, waitHours: o.waitHours } };
  if (o.bestTime) return { sendTime: "best" };
  return {};
}

export default function CampaignSendOptions({ value, onChange, subjectA, inputStyle, labelStyle }: {
  value: SendOptions; onChange: (v: SendOptions) => void; subjectA: string; inputStyle: CSSProperties; labelStyle: CSSProperties;
}) {
  const set = (patch: Partial<SendOptions>) => onChange({ ...value, ...patch });
  const same = value.ab && value.subjectB.trim() !== "" && value.subjectB.trim() === subjectA.trim();
  return (
    <fieldset className="border rounded p-2 mt-2 text-sm" style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }} data-testid="campaign-send-options">
      <legend className="font-medium px-1">Send options</legend>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={value.ab} onChange={(e) => set({ ab: e.target.checked, bestTime: e.target.checked ? false : value.bestTime })} />
        Test two subject lines first
      </label>
      {value.ab && (
        <div className="flex flex-wrap gap-2 items-end mt-1 ml-6">
          <label style={labelStyle}>Subject B
            <input value={value.subjectB} onChange={(e) => set({ subjectB: e.target.value })} className="block border rounded px-2 py-1 text-sm mt-1" style={inputStyle} />
          </label>
          <label style={labelStyle}>Test on
            <select value={value.testPercent} onChange={(e) => set({ testPercent: Number(e.target.value) })} className="block border rounded px-2 py-1 text-sm mt-1" style={inputStyle}>
              {[10, 20, 30, 40, 50].map((p) => <option key={p} value={p}>{p}% of the audience</option>)}
            </select>
          </label>
          <label style={labelStyle}>Pick the winner after
            <select value={value.waitHours} onChange={(e) => set({ waitHours: Number(e.target.value) })} className="block border rounded px-2 py-1 text-sm mt-1" style={inputStyle}>
              {[1, 2, 4, 8, 12, 24].map((h) => <option key={h} value={h}>{h} hour{h === 1 ? "" : "s"}</option>)}
            </select>
          </label>
          <p style={{ flexBasis: "100%", margin: 0, fontSize: 12, color: same ? "var(--ui-text-danger, #b91c1c)" : "var(--ui-text-muted)" }}>
            {same ? "The two subject lines are the same. Change one of them." : "Half the test group gets each subject. The one opened more goes to everyone else."}
          </p>
        </div>
      )}
      <label className="flex items-center gap-2 mt-1">
        <input type="checkbox" checked={value.bestTime} onChange={(e) => set({ bestTime: e.target.checked, ab: e.target.checked ? false : value.ab })} />
        Send at each person&apos;s best time (the hour they usually open email, within a day, between 9 a.m. and 8 p.m. Alberta time)
      </label>
    </fieldset>
  );
}
