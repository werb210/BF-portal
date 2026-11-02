// BF_PORTAL_v869_SETTINGS_PACK_NPS - Settings > Client survey (Admins): the
// post-funding survey and review request, and its report. BF-Server /api/surveys.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { Field, Notice, Section, Toggle, button, cell, errText, input, muted, when } from "./ui";

type Settings = { enabled: boolean; delay_days: number; question: string; comment_prompt: string; email_subject: string; email_intro: string; sms_text: string; review_url: string };
type Report = { nps: number | null; responses: number; sent: number; promoters: number; passives: number; detractors: number; response_rate: number | null;
  by_month: Array<{ month: string; nps: number | null; responses: number }>; recent: Array<{ contact_name: string | null; score: number; comment: string | null; responded_at: string }> };

export function SurveyReport() {
  const [r, setR] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { void api.get<Report>("/api/surveys/report").then(setR).catch((e) => setErr(errText(e, "Could not load the survey report."))); }, []);
  return (
    <Section id="nps-report" title="Survey results (last 12 months)" intro="NPS = % who scored 9-10 minus % who scored 0-6.">
      <Notice error={err} />
      {r && <>
        <p style={{ fontSize: 28, fontWeight: 700, margin: "4px 0", color: "var(--ui-text)" }} data-testid="nps-score">{r.nps === null ? "No answers yet" : `NPS ${r.nps}`}</p>
        <p style={muted}>{r.responses} answers from {r.sent} surveys sent{r.response_rate !== null ? ` (${r.response_rate}%)` : ""}: {r.promoters} promoters, {r.passives} passives, {r.detractors} detractors.</p>
        {r.by_month.length > 0 && <table style={{ borderCollapse: "collapse", marginBottom: 10 }}><tbody>{r.by_month.map((m) => <tr key={m.month}><td style={cell}>{m.month}</td><td style={cell}>NPS {m.nps ?? "-"}</td><td style={cell}>{m.responses} answers</td></tr>)}</tbody></table>}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>{r.recent.map((x, i) => <tr key={i}><td style={cell}>{when(x.responded_at)}</td><td style={cell}>{x.contact_name ?? "Client"}</td><td style={cell}>{x.score}</td><td style={cell}>{x.comment ?? ""}</td></tr>)}</tbody>
        </table>
      </>}
    </Section>
  );
}

export default function SurveySettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setS((await api.get<{ settings: Settings }>("/api/surveys/settings")).settings); } catch (e) { setErr(errText(e, "Could not load the survey settings.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (!s) return <div data-testid="survey-settings"><Notice error={err} />{!err && <p style={muted}>Loading...</p>}</div>;
  const save = async () => {
    setErr(null); setOk(null);
    try { await api.put("/api/surveys/settings", { settings: s }); setOk(s.enabled ? "Saved. Clients whose deals fund from now on get the survey." : "Saved."); } catch (e) { setErr(errText(e, "Could not save.")); }
  };
  const text = (k: keyof Settings, label: string, rows = 1) => (
    <Field id={`nps-${k}`} label={label}>
      {rows > 1 ? <textarea id={`nps-${k}`} rows={rows} value={String(s[k])} onChange={(e) => setS({ ...s, [k]: e.target.value })} style={input} />
        : <input id={`nps-${k}`} value={String(s[k])} onChange={(e) => setS({ ...s, [k]: e.target.value })} style={input} />}
    </Field>
  );
  return (
    <div data-testid="survey-settings">
      <Section id="nps" title="Survey after funding" intro="When a deal funds, the client gets one question (0-10) and a comment box, by email, and by text only if they agreed to texts. Clients who answer 9 or 10 are offered your Google review link.">
        <Toggle id="nps-on" label="Send the survey after a deal funds" checked={s.enabled} onChange={(enabled) => setS({ ...s, enabled })} />
        <Field id="nps-delay" label="Days after funding"><input id="nps-delay" type="number" min={0} max={90} value={s.delay_days} onChange={(e) => setS({ ...s, delay_days: Number(e.target.value) })} style={{ ...input, width: 100 }} /></Field>
        {text("question", "Question")}
        {text("comment_prompt", "Comment prompt")}
        {text("email_subject", "Email subject")}
        {text("email_intro", "Email opening", 3)}
        {text("sms_text", "Text message", 2)}
        {text("review_url", "Google review link (https://...)")}
        <button type="button" style={button} onClick={() => void save()}>Save survey settings</button>
        <Notice error={err} ok={ok} />
      </Section>
      <SurveyReport />
    </div>
  );
}
