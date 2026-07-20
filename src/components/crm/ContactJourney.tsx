import { useEffect, useState } from "react";
import { api } from "@/api";

// BF_PORTAL_VISITOR_JOURNEY_v1 - the visitor's pre-application journey on the contact
// record: which ad brought them, every page they viewed and for how long, the page they
// dropped off from, and their path through the application wizard. Renders nothing when
// there is no journey (e.g. contacts created before tracking, or non-web contacts).

type JourneySession = {
  session_id: string;
  first_seen_at: string;
  last_seen_at: string;
  landing_page: string | null;
  referrer: string | null;
  gclid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
};

type JourneyEvent = {
  session_id: string;
  event_type: string;
  path: string | null;
  title: string | null;
  step: string | null;
  dwell_ms: number | null;
  occurred_at: string;
};

type JourneySummary = {
  pageviewCount: number;
  totalDwellMs: number;
  exitPage: string | null;
  lastWizardStep: string | null;
  submitted: boolean;
};

type JourneyPayload = { sessions: JourneySession[]; events: JourneyEvent[]; summary?: JourneySummary };

function duration(ms: number | null | undefined): string {
  const n = Number(ms) || 0;
  if (n <= 0) return "-";
  if (n < 1000) return "<1s";
  const s = Math.round(n / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

const box: React.CSSProperties = {
  marginTop: 16,
  border: "1px solid var(--ui-border-soft)",
  borderRadius: 6,
  padding: 16,
};

const subtle: React.CSSProperties = { color: "var(--ui-text-muted)", fontSize: "0.85rem" };

export default function ContactJourney({ contactId }: { contactId: string }) {
  const [data, setData] = useState<JourneyPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<{ data?: JourneyPayload } & Partial<JourneyPayload>>(`/api/crm/contacts/${contactId}/journey`)
      .then((r) => {
        if (cancelled) return;
        const payload = (r?.data ?? r) as JourneyPayload;
        setData(payload && Array.isArray(payload.sessions) ? payload : null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (loading) return null;
  // BF_PORTAL_VISITOR_JOURNEY_EMPTY_v1 - say so explicitly rather than rendering nothing, so
  // "no journey recorded" is distinguishable from "the panel is broken".
  if (!data || data.sessions.length === 0) {
    return (
      <section style={box}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Visitor journey</h3>
        <p style={subtle}>
          No browsing history recorded for this contact. Journey tracking captures the ad, pages,
          and wizard path for people who visit the site from now on &mdash; contacts created before
          tracking was enabled will not have one.
        </p>
      </section>
    );
  }

  const first = data.sessions[0];
  if (!first) return null;
  const summary = data.summary;
  const adSource = first.gclid
    ? "Google Ads (paid click)"
    : first.utm_source
      ? `${first.utm_source}${first.utm_medium ? ` / ${first.utm_medium}` : ""}`
      : first.referrer
        ? `Referral: ${first.referrer}`
        : "Direct";

  return (
    <section style={box}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Visitor journey</h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Stat label="Source" value={adSource} />
        {first.utm_campaign ? <Stat label="Campaign" value={first.utm_campaign} /> : null}
        {first.utm_term ? <Stat label="Keyword" value={first.utm_term} /> : null}
        <Stat label="Landing page" value={first.landing_page ?? "-"} />
        <Stat label="Pages viewed" value={String(summary?.pageviewCount ?? 0)} />
        <Stat label="Time on site" value={duration(summary?.totalDwellMs)} />
        <Stat label="First seen" value={new Date(first.first_seen_at).toLocaleString()} />
        {summary?.submitted ? (
          <Stat label="Outcome" value="Submitted application" />
        ) : (
          <Stat label="Dropped off at" value={summary?.exitPage ?? "-"} />
        )}
        {summary?.lastWizardStep ? <Stat label="Last wizard step" value={`Step ${summary.lastWizardStep}`} /> : null}
      </div>

      <div style={{ ...subtle, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
        Path
      </div>
      <ol style={{ margin: 0, paddingLeft: 18 }}>
        {data.events.map((e, i) => (
          <li key={`${e.session_id}-${i}`} style={{ marginBottom: 6 }}>
            <span style={{ color: "var(--ui-text)" }}>
              {e.event_type === "pageview"
                ? pageName(e) /* BF_PORTAL_JOURNEY_PAGE_NAMES_v1 */
                : e.event_type === "wizard_step"
                  ? `Wizard step ${e.step ?? "?"}`
                  : e.event_type === "application_submitted"
                    ? "Submitted application"
                    : e.event_type}
            </span>
            {e.dwell_ms ? <span style={{ ...subtle, marginLeft: 8 }}>{duration(e.dwell_ms)}</span> : null}
            <span style={{ ...subtle, marginLeft: 8 }}>{new Date(e.occurred_at).toLocaleTimeString()}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// BF_PORTAL_JOURNEY_PAGE_NAMES_v1 - show human page names in the journey path instead of raw URLs.
function prettifyPath(path: string | null): string {
  const p = (path ?? "").replace(/[?#].*$/, "").replace(/\/+$/, "");
  if (!p) return "Home";
  const seg = p.split("/").filter(Boolean).pop() ?? "";
  if (!seg) return "Home";
  return seg.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function pageName(e: JourneyEvent): string {
  const p = (e.path ?? "").replace(/[?#].*$/, "").replace(/\/+$/, "");
  if (!p) return "Home";
  const t = (e.title ?? "").trim();
  if (t) {
    const cleaned = t.replace(/\s+[|\u2013\u2014-]\s+.*$/, "").trim();
    if (cleaned && !/^boreal/i.test(cleaned)) return cleaned;
  }
  return prettifyPath(e.path);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={subtle}>{label}</div>
      <div style={{ color: "var(--ui-text)", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}
