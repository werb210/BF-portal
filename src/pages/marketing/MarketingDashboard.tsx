// BF_PORTAL_MARKETING_FUNNEL_LIVE_v1 — Analytics tab renders the live
// application funnel from GET /api/marketing/funnel (respondOk envelope).
import { useEffect, useState } from "react";
import { api } from "@/api";

type MarketingTab = "google-ads" | "sms" | "email" | "linkedin-ads" | "analytics";

const MARKETING_TABS: { id: MarketingTab; label: string }[] = [
  { id: "google-ads", label: "Google Ads" },
  { id: "sms", label: "SMS" },
  { id: "email", label: "Email" },
  { id: "linkedin-ads", label: "LinkedIn Ads" },
  { id: "analytics", label: "Analytics" },
];

type FunnelStep = {
  key: string;
  label: string;
  count: number;
  pctOfStart: number;
  dropFromPrev: number;
};

// BF_PORTAL_GOOGLE_ADS_v1 - Google Ads spend/performance from GET /api/marketing/google-ads.
type AdsRow = { name: string; status?: string; cost: number; impressions: number; clicks: number; ctr: number; cpc: number; conversions: number; convValue: number };
type AdsReport = { configured: boolean; days?: number; cached?: boolean; error?: string; totals?: { cost: number; impressions: number; clicks: number; conversions: number; convValue: number; cpa: number; roas: number }; campaigns?: AdsRow[]; keywords?: AdsRow[]; searchTerms?: AdsRow[] };
const money = (n: number) => `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
function AdsTable({ title, rows }: { title: string; rows: AdsRow[] }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="text-sm font-semibold mb-1" style={{ color: "var(--ui-text)" }}>{title}</div>
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={`${r.name}-${i}`} className="flex items-center justify-between text-sm" style={{ color: "var(--ui-text)" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" }}>{r.name}</span>
            <span style={{ color: "var(--ui-text-muted)" }}>{money(r.cost)} &middot; {r.clicks} clicks &middot; {r.conversions} conv</span>
          </div>
        ))}
      </div>
    </div>
  );
}
// BF_PORTAL_ADS_CONVERSIONS_v1 - closed-loop funded-deal conversions to Google.
type PendingConv = { applicationId: string; gclid: string; value: number; fundedAt: string };
function AdsConversionsPanel() {
  const [data, setData] = useState<{ configured: boolean; count?: number; pending?: PendingConv[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => {
    setLoading(true);
    api
      .get<{ data?: { configured: boolean; count?: number; pending?: PendingConv[] } } & { configured?: boolean; count?: number; pending?: PendingConv[] }>("/api/marketing/google-ads/conversions/pending")
      .then((res) => setData((res?.data ?? res) as any))
      .catch(() => setData({ configured: false }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const upload = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await api.post<{ data?: { uploaded?: number; failed?: number } } & { uploaded?: number; failed?: number }>("/api/marketing/google-ads/conversions/upload", {});
      const r = (res?.data ?? res) as { uploaded?: number; failed?: number };
      setMsg(`Uploaded ${r?.uploaded ?? 0}${r?.failed ? `, ${r.failed} failed` : ""}.`);
      load();
    } catch {
      setMsg("Upload failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="drawer-section">
      <div className="drawer-section__title mb-2">Closed-loop conversions</div>
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading...</p>}
      {!loading && data && !data.configured && (
        <p style={{ color: "var(--ui-text-muted)" }}>Set GOOGLE_ADS_CONVERSION_ACTION_ID (the "Funded Deal" conversion action) to send funded deals back to Google with their value.</p>
      )}
      {!loading && data?.configured && (
        <>
          <p style={{ color: "var(--ui-text)" }}>{data.count ?? 0} funded deal(s) with a Google click ready to upload.</p>
          <button type="button" disabled={busy || !(data.count ?? 0)} onClick={() => void upload()} className="ui-button ui-button--primary mt-2" style={{ opacity: busy || !(data.count ?? 0) ? 0.6 : 1 }}>{busy ? "Uploading..." : "Upload to Google"}</button>
          {msg && <p style={{ color: "var(--ui-text-muted)", marginTop: 6 }}>{msg}</p>}
        </>
      )}
    </section>
  );
}
// BF_PORTAL_ICP_BUILDER_v1 - ideal-client engine: build + download a Customer Match seed.
type IcpPreview = { eligible: number; withPhone: number; byProduct: Record<string, number>; byBand: Record<string, number> };
function IcpBuilderPanel() {
  const [band, setBand] = useState("any");
  const [product, setProduct] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [preview, setPreview] = useState<IcpPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    api
      .get<{ data?: { products?: string[] } } & { products?: string[] }>("/api/marketing/google-ads/icp/products")
      .then((res) => { const d = (res?.data ?? res) as { products?: string[] }; setProducts(d?.products ?? []); })
      .catch(() => setProducts([]));
  }, []);
  const filters = () => {
    const f: { productCategory?: string; minAmount?: number; maxAmount?: number } = {};
    if (product.trim()) f.productCategory = product.trim();
    if (band === "lt100") f.maxAmount = 99999;
    else if (band === "100to500") { f.minAmount = 100000; f.maxAmount = 500000; }
    else if (band === "gt500") f.minAmount = 500000;
    return f;
  };
  const runPreview = () => {
    setLoading(true); setMsg(null);
    api
      .get<{ data?: IcpPreview } & Partial<IcpPreview>>("/api/marketing/google-ads/icp/preview", { params: filters() })
      .then((res) => setPreview((res?.data ?? res) as IcpPreview))
      .catch(() => setMsg("Preview failed."))
      .finally(() => setLoading(false));
  };
  const download = async (type: "seed" | "exclusion") => {
    setMsg(null);
    try {
      const res = await api.post<{ data?: { csv: string; rows: number } } & { csv?: string; rows?: number }>("/api/marketing/google-ads/icp/export", { type, ...filters() });
      const r = (res?.data ?? res) as { csv?: string; rows?: number };
      const csv = r?.csv ?? "";
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = type === "seed" ? "customer-match-seed.csv" : "customer-match-exclusion.csv";
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMsg(`${r?.rows ?? 0} hashed row(s) downloaded.`);
    } catch {
      setMsg("Export failed.");
    }
  };
  return (
    <section className="drawer-section">
      <div className="drawer-section__title mb-2">Ideal-client builder</div>
      <p style={{ color: "var(--ui-text-muted)", marginBottom: 8 }}>Build a seed of your funded clients to feed Google Customer Match. The download is SHA-256 hashed - no raw contact data leaves the system. Upload it in Google Ads - Audiences - Customer Match, then use it as a lookalike signal in Performance Max and as an exclusion on prospecting campaigns.</p>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-sm" style={{ color: "var(--ui-text)" }}>Deal size
          <select value={band} onChange={(e) => setBand(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
            <option value="any">Any</option>
            <option value="lt100">Under $100k</option>
            <option value="100to500">$100k - $500k</option>
            <option value="gt500">$500k+</option>
          </select>
        </label>
        <label className="text-sm" style={{ color: "var(--ui-text)" }}>Product category
          <select value={product} onChange={(e) => setProduct(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
            <option value="">Any</option>
            {products.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <button type="button" onClick={runPreview} className="ui-button ui-button--secondary">{loading ? "..." : "Preview"}</button>
      </div>
      {preview && (
        <div className="mt-3 text-sm" style={{ color: "var(--ui-text)" }}>
          <div><strong>{preview.eligible}</strong> eligible funded client(s); {preview.withPhone} with a phone.</div>
          <div style={{ color: "var(--ui-text-muted)", marginTop: 4 }}>By product: {Object.entries(preview.byProduct).map(([k, v]) => `${k} (${v})`).join(", ") || "-"}</div>
          <div style={{ color: "var(--ui-text-muted)" }}>By size: {Object.entries(preview.byBand).map(([k, v]) => `${k} (${v})`).join(", ") || "-"}</div>
          {preview.eligible < 100 && <div style={{ color: "#b45309", marginTop: 4 }}>Note: Google Customer Match needs at least 100 matched members to serve.</div>}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" onClick={() => void download("seed")} className="ui-button ui-button--primary">Download ideal-client seed (hashed)</button>
        <button type="button" onClick={() => void download("exclusion")} className="ui-button ui-button--secondary">Download exclusion list (hashed)</button>
      </div>
      {msg && <p style={{ color: "var(--ui-text-muted)", marginTop: 6 }}>{msg}</p>}
      <p style={{ color: "var(--ui-text-muted)", marginTop: 8, fontSize: "0.8rem" }}>Compliance: uploading client data to ad platforms is a sensitive-data action - the compliant standard is express opt-in. This list includes funded clients and excludes anyone marked opted-out.</p>
    </section>
  );
}
// BF_PORTAL_MAYA_SUGGESTIONS_v1 - Maya campaign recommendations, human-approved.
type AdAction = { type: string; resourceName: string; amountMicros?: number };
type Suggestion = { id: string; kind: string; title: string; rationale: string; severity: "info" | "warn"; action: AdAction };
function MayaSuggestionsPanel() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data?: { configured: boolean; suggestions: Suggestion[] } } & { configured?: boolean; suggestions?: Suggestion[] }>("/api/marketing/google-ads/suggestions")
      .then((res) => {
        if (cancelled) return;
        const d = (res?.data ?? res) as { configured?: boolean; suggestions?: Suggestion[] };
        setConfigured(d?.configured !== false);
        setItems(d?.suggestions ?? []);
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const dismiss = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));
  const approve = async (sug: Suggestion) => {
    setBusyId(sug.id); setMsg(null);
    try {
      const res = await api.post<{ data?: { ok: boolean; error?: string } } & { ok?: boolean; error?: string }>("/api/marketing/google-ads/suggestions/apply", { action: sug.action });
      const r = (res?.data ?? res) as { ok?: boolean; error?: string };
      if (r?.ok) { setItems((xs) => xs.filter((x) => x.id !== sug.id)); setMsg("Applied."); }
      else setMsg(`Could not apply: ${r?.error ?? "error"}`);
    } catch {
      setMsg("Could not apply.");
    } finally {
      setBusyId(null);
    }
  };
  return (
    <section className="drawer-section">
      <div className="drawer-section__title mb-1">Maya's recommendations</div>
      <p style={{ color: "var(--ui-text-muted)", marginBottom: 8, fontSize: "0.85rem" }}>Suggestions from your Google Ads data. Nothing changes until you approve it.</p>
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading...</p>}
      {!loading && !configured && <p style={{ color: "var(--ui-text-muted)" }}>Connect Google Ads to see recommendations.</p>}
      {!loading && configured && items.length === 0 && <p style={{ color: "var(--ui-text-muted)" }}>No recommendations right now.</p>}
      {!loading && configured && items.map((sug) => (
        <div key={sug.id} className="border rounded p-3 mb-2" style={{ borderColor: "var(--ui-border)" }}>
          <div className="text-sm font-semibold" style={{ color: sug.severity === "warn" ? "#b45309" : "var(--ui-text)" }}>{sug.title}</div>
          <div className="text-sm" style={{ color: "var(--ui-text-muted)", marginTop: 2 }}>{sug.rationale}</div>
          <div className="flex gap-2 mt-2">
            <button type="button" disabled={busyId === sug.id} onClick={() => void approve(sug)} className="ui-button ui-button--primary" style={{ opacity: busyId === sug.id ? 0.6 : 1 }}>{busyId === sug.id ? "Applying..." : "Approve"}</button>
            <button type="button" disabled={busyId === sug.id} onClick={() => dismiss(sug.id)} className="ui-button ui-button--secondary">Dismiss</button>
          </div>
        </div>
      ))}
      {msg && <p style={{ color: "var(--ui-text-muted)", marginTop: 4 }}>{msg}</p>}
    </section>
  );
}
// BF_PORTAL_UTM_BUILDER_v1 - campaign URL builder (consistent utm tagging).
function UtmBuilderPanel() {
  const [base, setBase] = useState("https://boreal.financial");
  const [source, setSource] = useState("google");
  const [medium, setMedium] = useState("cpc");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const built = (() => {
    try {
      const url = new URL(base.trim());
      const set = (k: string, v: string) => { if (v.trim()) url.searchParams.set(k, v.trim()); };
      set("utm_source", source); set("utm_medium", medium); set("utm_campaign", campaign);
      set("utm_term", term); set("utm_content", content);
      return url.toString();
    } catch { return ""; }
  })();
  const copy = async () => {
    try { await navigator.clipboard.writeText(built); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  const field = (label: string, val: string, on: (v: string) => void, ph?: string) => (
    <label className="text-sm" style={{ color: "var(--ui-text)" }}>{label}
      <input value={val} onChange={(e) => on(e.target.value)} placeholder={ph} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }} />
    </label>
  );
  return (
    <section className="drawer-section">
      <div className="drawer-section__title mb-2">Campaign URL builder</div>
      <p style={{ color: "var(--ui-text-muted)", marginBottom: 8, fontSize: "0.85rem" }}>Build consistently tagged links for ads and emails. The tags flow through the website into the application so each funded deal traces back to its campaign.</p>
      <div className="grid grid-cols-2 gap-2">
        {field("Destination URL", base, setBase)}
        {field("Source", source, setSource, "google")}
        {field("Medium", medium, setMedium, "cpc")}
        {field("Campaign", campaign, setCampaign, "spring-term-loans")}
        {field("Term (optional)", term, setTerm)}
        {field("Content (optional)", content, setContent)}
      </div>
      <div className="mt-3 p-2 rounded text-sm break-all" style={{ background: "var(--ui-surface-strong)", color: "var(--ui-text)", border: "1px solid var(--ui-border)" }}>{built || "Enter a valid destination URL"}</div>
      <button type="button" onClick={() => void copy()} disabled={!built} className="ui-button ui-button--primary mt-2" style={{ opacity: built ? 1 : 0.6 }}>{copied ? "Copied" : "Copy URL"}</button>
    </section>
  );
}
function GoogleAdsPanel() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<AdsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data?: AdsReport } & Partial<AdsReport>>("/api/marketing/google-ads", { params: { days } })
      .then((res) => {
        if (cancelled) return;
        const r = (res?.data ?? res) as AdsReport;
        setReport(r ?? { configured: false });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load Google Ads");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [days]);
  const t = report?.totals;
  return (
    <section className="drawer-section">
      <div className="flex items-center justify-between mb-3">
        <div className="drawer-section__title">Google Ads</div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value) || 30)} className="border rounded px-2 py-1 text-sm" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading Google Ads...</p>}
      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {!loading && !error && report && !report.configured && (
        <p style={{ color: "var(--ui-text-muted)" }}>Not connected yet. Add the Google Ads API credentials (developer token, OAuth client + refresh token, customer ID) and spend, clicks, conversions, CPA, and ROAS will appear here.</p>
      )}
      {!loading && !error && report?.configured && report.error && (
        <p role="alert" style={{ color: "#dc2626" }}>Google Ads error: {report.error}</p>
      )}
      {!loading && !error && report?.configured && !report.error && t && (
        <>
          <div className="flex flex-wrap gap-2">
            <StatCard label="Spend" value={money(t.cost)} />
            <StatCard label="Clicks" value={String(t.clicks)} />
            <StatCard label="Conversions" value={String(t.conversions)} />
            <StatCard label="Cost / conv" value={money(t.cpa)} />
            <StatCard label="ROAS" value={`${t.roas}x`} />
          </div>
          <AdsTable title="Top campaigns" rows={report.campaigns ?? []} />
          <AdsTable title="Top keywords" rows={report.keywords ?? []} />
          <AdsTable title="Top search terms" rows={report.searchTerms ?? []} />
        </>
      )}
    </section>
  );
}

// BF_PORTAL_LINKEDIN_ADS_v1 - LinkedIn Ads spend/performance from GET /api/marketing/linkedin-ads.
type LiAdsTotals = { cost: number; impressions: number; clicks: number; conversions: number; ctr: number; cpc: number; cpa: number };
type LiAdsCampaign = { name: string; cost: number; impressions: number; clicks: number; ctr: number; cpc: number; conversions: number };
type LiAdsReportT = { configured: boolean; days?: number; cached?: boolean; error?: string; totals?: LiAdsTotals; campaigns?: LiAdsCampaign[] };
function LinkedInAdsPanel() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<LiAdsReportT | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data?: LiAdsReportT } & Partial<LiAdsReportT>>("/api/marketing/linkedin-ads", { params: { days } })
      .then((res) => {
        if (cancelled) return;
        const r = (res?.data ?? res) as LiAdsReportT;
        setReport(r ?? { configured: false });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load LinkedIn Ads");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [days]);
  const t = report?.totals;
  return (
    <section className="drawer-section">
      <div className="flex items-center justify-between mb-3">
        <div className="drawer-section__title">LinkedIn Ads</div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value) || 30)} className="border rounded px-2 py-1 text-sm" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading LinkedIn Ads...</p>}
      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {!loading && !error && report && !report.configured && (
        <p style={{ color: "var(--ui-text-muted)" }}>Not connected yet. Add the LinkedIn Advertising API credentials (OAuth client + refresh token, ad account ID) and spend, clicks, conversions, CTR, and CPC will appear here.</p>
      )}
      {!loading && !error && report?.configured && report.error && (
        <p role="alert" style={{ color: "#dc2626" }}>LinkedIn Ads error: {report.error}</p>
      )}
      {!loading && !error && report?.configured && !report.error && t && (
        <>
          <div className="flex flex-wrap gap-2">
            <StatCard label="Spend" value={money(t.cost)} />
            <StatCard label="Impressions" value={String(t.impressions)} />
            <StatCard label="Clicks" value={String(t.clicks)} />
            <StatCard label="CTR" value={`${(t.ctr * 100).toFixed(2)}%`} />
            <StatCard label="Conversions" value={String(t.conversions)} />
            <StatCard label="Cost / conv" value={money(t.cpa)} />
          </div>
          <AdsTable title="Top campaigns" rows={(report.campaigns ?? []).map((c) => ({ ...c, convValue: 0 }))} />
        </>
      )}
    </section>
  );
}

// BF_PORTAL_LINKEDIN_CONV_v1 - closed-loop funded-deal conversions to LinkedIn.
function LinkedInConversionsPanel() {
  const [data, setData] = useState<{ configured: boolean; count?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => {
    setLoading(true);
    api
      .get<{ data?: { configured: boolean; count?: number } } & { configured?: boolean; count?: number }>("/api/marketing/linkedin-ads/conversions/pending")
      .then((res) => setData((res?.data ?? res) as { configured: boolean; count?: number }))
      .catch(() => setData({ configured: false }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const upload = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await api.post<{ data?: { uploaded?: number; failed?: number } } & { uploaded?: number; failed?: number }>("/api/marketing/linkedin-ads/conversions/upload", {});
      const r = (res?.data ?? res) as { uploaded?: number; failed?: number };
      setMsg(`Uploaded ${r?.uploaded ?? 0}${r?.failed ? `, ${r.failed} failed` : ""}.`);
      load();
    } catch {
      setMsg("Upload failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="drawer-section">
      <div className="drawer-section__title mb-2">Closed-loop conversions</div>
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading...</p>}
      {!loading && data && !data.configured && (
        <p style={{ color: "var(--ui-text-muted)" }}>Set LINKEDIN_CONVERSION_URN (your &quot;Funded Deal&quot; conversion rule) to send funded deals with a LinkedIn click back to LinkedIn with their value.</p>
      )}
      {!loading && data?.configured && (
        <>
          <p style={{ color: "var(--ui-text)" }}>{data.count ?? 0} funded deal(s) with a LinkedIn click ready to upload.</p>
          <button type="button" disabled={busy || !(data.count ?? 0)} onClick={() => void upload()} className="ui-button ui-button--primary mt-2" style={{ opacity: busy || !(data.count ?? 0) ? 0.6 : 1 }}>{busy ? "Uploading..." : "Upload to LinkedIn"}</button>
          {msg && <p style={{ color: "var(--ui-text-muted)", marginTop: 6 }}>{msg}</p>}
        </>
      )}
    </section>
  );
}

// BF_PORTAL_LINKEDIN_AUDIENCE_v1 - LinkedIn matched-audience export (reuses the ICP engine).
function LinkedInAudiencePanel() {
  const [band, setBand] = useState("any");
  const [product, setProduct] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [preview, setPreview] = useState<IcpPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    api
      .get<{ data?: { products?: string[] } } & { products?: string[] }>("/api/marketing/google-ads/icp/products")
      .then((res) => { const d = (res?.data ?? res) as { products?: string[] }; setProducts(d?.products ?? []); })
      .catch(() => setProducts([]));
  }, []);
  const filters = () => {
    const f: { productCategory?: string; minAmount?: number; maxAmount?: number } = {};
    if (product.trim()) f.productCategory = product.trim();
    if (band === "lt100") f.maxAmount = 99999;
    else if (band === "100to500") { f.minAmount = 100000; f.maxAmount = 500000; }
    else if (band === "gt500") f.minAmount = 500000;
    return f;
  };
  const runPreview = () => {
    setLoading(true); setMsg(null);
    api
      .get<{ data?: IcpPreview } & Partial<IcpPreview>>("/api/marketing/google-ads/icp/preview", { params: filters() })
      .then((res) => setPreview((res?.data ?? res) as IcpPreview))
      .catch(() => setMsg("Preview failed."))
      .finally(() => setLoading(false));
  };
  const download = async (type: "seed" | "exclusion") => {
    setMsg(null);
    try {
      const res = await api.post<{ data?: { csv: string; rows: number } } & { csv?: string; rows?: number }>("/api/marketing/linkedin-ads/icp/export", { type, ...filters() });
      const r = (res?.data ?? res) as { csv?: string; rows?: number };
      const csv = r?.csv ?? "";
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = type === "seed" ? "linkedin-audience-seed.csv" : "linkedin-audience-exclusion.csv";
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMsg(`${r?.rows ?? 0} hashed email(s) downloaded.`);
    } catch {
      setMsg("Export failed.");
    }
  };
  return (
    <section className="drawer-section">
      <div className="drawer-section__title mb-2">Matched audience export</div>
      <p style={{ color: "var(--ui-text-muted)", marginBottom: 8 }}>Build a seed of your funded clients for LinkedIn Matched Audiences. The download is a single &quot;email&quot; column of SHA-256 hashes - no raw contact data leaves the system. Upload it in Campaign Manager - Audiences - Create audience - Upload a list - Contact list, then target it or use it as an exclusion on prospecting campaigns.</p>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-sm" style={{ color: "var(--ui-text)" }}>Deal size
          <select value={band} onChange={(e) => setBand(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
            <option value="any">Any</option>
            <option value="lt100">Under $100k</option>
            <option value="100to500">$100k - $500k</option>
            <option value="gt500">$500k+</option>
          </select>
        </label>
        <label className="text-sm" style={{ color: "var(--ui-text)" }}>Product category
          <select value={product} onChange={(e) => setProduct(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
            <option value="">Any</option>
            {products.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <button type="button" onClick={runPreview} className="ui-button ui-button--secondary">{loading ? "..." : "Preview"}</button>
      </div>
      {preview && (
        <div className="mt-3 text-sm" style={{ color: "var(--ui-text)" }}>
          <div><strong>{preview.eligible}</strong> eligible funded client(s).</div>
          <div style={{ color: "var(--ui-text-muted)", marginTop: 4 }}>By product: {Object.entries(preview.byProduct).map(([k, v]) => `${k} (${v})`).join(", ") || "-"}</div>
          <div style={{ color: "var(--ui-text-muted)" }}>By size: {Object.entries(preview.byBand).map(([k, v]) => `${k} (${v})`).join(", ") || "-"}</div>
          {preview.eligible < 300 && <div style={{ color: "#b45309", marginTop: 4 }}>Note: LinkedIn needs at least 300 matched members to serve an audience.</div>}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" onClick={() => void download("seed")} className="ui-button ui-button--primary">Download LinkedIn list (hashed)</button>
        <button type="button" onClick={() => void download("exclusion")} className="ui-button ui-button--secondary">Download exclusion list (hashed)</button>
      </div>
      {msg && <p style={{ color: "var(--ui-text-muted)", marginTop: 6 }}>{msg}</p>}
      <p style={{ color: "var(--ui-text-muted)", marginTop: 8, fontSize: "0.8rem" }}>Compliance: uploading client data to ad platforms is a sensitive-data action - the compliant standard is express opt-in. This list includes funded clients and excludes anyone marked opted-out.</p>
    </section>
  );
}

// BF_PORTAL_LINKEDIN_SUGGEST_v1 - Maya LinkedIn campaign recommendations, human-approved.
type LiSugAction = { type: string; campaignId?: string };
type LiSuggestionT = { id: string; kind: string; title: string; rationale: string; severity: "info" | "warn"; action: LiSugAction };
function LinkedInSuggestionsPanel() {
  const [items, setItems] = useState<LiSuggestionT[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data?: { configured: boolean; suggestions: LiSuggestionT[] } } & { configured?: boolean; suggestions?: LiSuggestionT[] }>("/api/marketing/linkedin-ads/suggestions")
      .then((res) => {
        if (cancelled) return;
        const d = (res?.data ?? res) as { configured?: boolean; suggestions?: LiSuggestionT[] };
        setConfigured(d?.configured !== false);
        setItems(d?.suggestions ?? []);
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const dismiss = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));
  const approve = async (sug: LiSuggestionT) => {
    setBusyId(sug.id); setMsg(null);
    try {
      const res = await api.post<{ data?: { ok: boolean; error?: string } } & { ok?: boolean; error?: string }>("/api/marketing/linkedin-ads/suggestions/apply", { action: sug.action });
      const r = (res?.data ?? res) as { ok?: boolean; error?: string };
      if (r?.ok) { setItems((xs) => xs.filter((x) => x.id !== sug.id)); setMsg("Applied."); }
      else setMsg(`Could not apply: ${r?.error ?? "error"}`);
    } catch {
      setMsg("Could not apply.");
    } finally {
      setBusyId(null);
    }
  };
  return (
    <section className="drawer-section">
      <div className="drawer-section__title mb-1">Maya's recommendations</div>
      <p style={{ color: "var(--ui-text-muted)", marginBottom: 8, fontSize: "0.85rem" }}>Suggestions from your LinkedIn Ads data. Nothing changes until you approve it.</p>
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading...</p>}
      {!loading && !configured && <p style={{ color: "var(--ui-text-muted)" }}>Connect LinkedIn Ads to see recommendations.</p>}
      {!loading && configured && items.length === 0 && <p style={{ color: "var(--ui-text-muted)" }}>No recommendations right now.</p>}
      {!loading && configured && items.map((sug) => (
        <div key={sug.id} className="border rounded p-3 mb-2" style={{ borderColor: "var(--ui-border)" }}>
          <div className="text-sm font-semibold" style={{ color: sug.severity === "warn" ? "#b45309" : "var(--ui-text)" }}>{sug.title}</div>
          <div className="text-sm" style={{ color: "var(--ui-text-muted)", marginTop: 2 }}>{sug.rationale}</div>
          <div className="flex gap-2 mt-2">
            <button type="button" disabled={busyId === sug.id} onClick={() => void approve(sug)} className="ui-button ui-button--primary" style={{ opacity: busyId === sug.id ? 0.6 : 1 }}>{busyId === sug.id ? "Applying..." : "Approve"}</button>
            <button type="button" disabled={busyId === sug.id} onClick={() => dismiss(sug.id)} className="ui-button ui-button--secondary">Dismiss</button>
          </div>
        </div>
      ))}
      {msg && <p style={{ color: "var(--ui-text-muted)", marginTop: 4 }}>{msg}</p>}
    </section>
  );
}

// BF_PORTAL_EMAIL_COMPOSER_v1 - SendGrid bulk marketing email (BF silo).
type EmailSegments = { configured: boolean; all: number; segments: { tag: string; n: number }[] };
function EmailComposerPanel() {
  const [seg, setSeg] = useState<EmailSegments | null>(null);
  const [tag, setTag] = useState("__all__");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    api
      .get<{ data?: EmailSegments } & Partial<EmailSegments>>("/api/marketing/email/segments")
      .then((res) => setSeg((res?.data ?? res) as EmailSegments))
      .catch(() => setSeg({ configured: false, all: 0, segments: [] }));
  }, []);
  const count = tag === "__all__" ? (seg?.all ?? 0) : (seg?.segments.find((x) => x.tag === tag)?.n ?? 0);
  const post = async (test?: string) => {
    setBusy(true); setMsg(null);
    try {
      const payload: Record<string, unknown> = { subject, html };
      if (test) payload.test = test; else if (tag !== "__all__") payload.tag = tag;
      const res = await api.post<{ data?: Record<string, unknown> } & Record<string, unknown>>("/api/marketing/email/send", payload);
      const r = (res?.data ?? res) as { test?: boolean; ok?: boolean; sent?: number; failed?: number; configured?: boolean; error?: string };
      if (r?.configured === false) setMsg("SendGrid not connected yet (set SENDGRID_API_KEY).");
      else if (r?.error) setMsg(r.error);
      else if (r?.test) setMsg(r.ok ? "Test sent." : "Test failed.");
      else setMsg(`Sent ${r?.sent ?? 0}${r?.failed ? `, ${r.failed} failed` : ""}.`);
    } catch { setMsg("Send failed."); } finally { setBusy(false); }
  };
  if (seg && !seg.configured) {
    return <section className="drawer-section"><div className="drawer-section__title mb-2">Email</div><p style={{ color: "var(--ui-text-muted)" }}>Not connected yet. Set SENDGRID_API_KEY and SENDGRID_FROM, and authenticate your sending domain, to send marketing email.</p></section>;
  }
  return (
    <section className="drawer-section">
      <div className="drawer-section__title mb-2">Email campaign</div>
      <div className="space-y-2">
        <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Audience
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
            <option value="__all__">All contacts ({seg?.all ?? 0})</option>
            {(seg?.segments ?? []).map((x) => <option key={x.tag} value={x.tag}>{x.tag} ({x.n})</option>)}
          </select>
        </label>
        <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }} />
        </label>
        <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Body (HTML)
          <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={8} className="block border rounded px-2 py-1 text-sm mt-1 w-full font-mono" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }} />
        </label>
        <p style={{ color: "var(--ui-text-muted)", fontSize: "0.8rem" }}>Merge fields: {"{{first_name}}"}, {"{{name}}"}, {"{{company}}"}, {"{{email}}"}.</p>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm" style={{ color: "var(--ui-text)" }}>Test to
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@boreal.financial" className="block border rounded px-2 py-1 text-sm mt-1" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }} />
          </label>
          <button type="button" disabled={busy || !subject || !html || !testTo} onClick={() => void post(testTo)} className="ui-button ui-button--secondary">Send test</button>
          <button type="button" disabled={busy || !subject || !html || !count} onClick={() => void post()} className="ui-button ui-button--primary">{busy ? "Sending..." : `Send to ${count}`}</button>
        </div>
        {msg && <p style={{ color: "var(--ui-text-muted)" }}>{msg}</p>}
      </div>
    </section>
  );
}
// BF_PORTAL_SMS_COMPOSER_v1 - bulk SMS + 36h fallback-email cascade (BF silo).
type SmsSegments = { configured: boolean; all: number; segments: { tag: string; n: number }[] };
function SmsComposerPanel() {
  const [seg, setSeg] = useState<SmsSegments | null>(null);
  const [tag, setTag] = useState("__all__");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [fbSubject, setFbSubject] = useState("");
  const [fbHtml, setFbHtml] = useState("");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    api
      .get<{ data?: SmsSegments } & Partial<SmsSegments>>("/api/marketing/sms/segments")
      .then((res) => setSeg((res?.data ?? res) as SmsSegments))
      .catch(() => setSeg({ configured: false, all: 0, segments: [] }));
  }, []);
  const count = tag === "__all__" ? (seg?.all ?? 0) : (seg?.segments.find((x) => x.tag === tag)?.n ?? 0);
  const post = async (test?: string) => {
    setBusy(true); setMsg(null);
    try {
      const payload: Record<string, unknown> = { body };
      if (test) { payload.test = test; }
      else {
        if (tag !== "__all__") payload.tag = tag;
        if (linkUrl.trim()) payload.linkUrl = linkUrl.trim();
        if (fbSubject.trim()) payload.fallbackSubject = fbSubject.trim();
        if (fbHtml.trim()) payload.fallbackHtml = fbHtml.trim();
      }
      const res = await api.post<{ data?: Record<string, unknown> } & Record<string, unknown>>("/api/marketing/sms/send", payload);
      const r = (res?.data ?? res) as { test?: boolean; ok?: boolean; smsSent?: number; emailSent?: number; failed?: number; configured?: boolean; error?: string };
      if (r?.configured === false) setMsg("SMS not connected yet (set the toll-free number once A2P-verified).");
      else if (r?.error) setMsg(r.error);
      else if (r?.test) setMsg(r.ok ? "Test sent." : `Test failed${r ? "" : ""}.`);
      else setMsg(`SMS: ${r?.smsSent ?? 0}, fallback email: ${r?.emailSent ?? 0}${r?.failed ? `, failed: ${r.failed}` : ""}.`);
    } catch { setMsg("Send failed."); } finally { setBusy(false); }
  };
  if (seg && !seg.configured) {
    return <section className="drawer-section"><div className="drawer-section__title mb-2">SMS</div><p style={{ color: "var(--ui-text-muted)" }}>Not connected yet. Once your toll-free 800 number clears A2P verification, set TWILIO_SMS_FROM and bulk SMS will be available here.</p></section>;
  }
  return (
    <section className="drawer-section">
      <div className="drawer-section__title mb-2">SMS campaign</div>
      <div className="space-y-2">
        <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Audience
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
            <option value="__all__">All contacts with a mobile ({seg?.all ?? 0})</option>
            {(seg?.segments ?? []).map((x) => <option key={x.tag} value={x.tag}>{x.tag} ({x.n})</option>)}
          </select>
        </label>
        <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Message
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={400} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }} />
        </label>
        <p style={{ color: "var(--ui-text-muted)", fontSize: "0.8rem" }}>{body.length} chars. Merge: {"{{first_name}}"} not applied to SMS; keep it short. A tracked link is appended if you add a landing page below.</p>
        <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Landing page (optional, tracked)
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://boreal.financial/..." className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }} />
        </label>
        <div className="border-t pt-2" style={{ borderColor: "var(--ui-border)" }}>
          <div className="text-sm font-semibold mb-1" style={{ color: "var(--ui-text)" }}>Fallback email (sent after 36h with no click/reply, or no mobile)</div>
          <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Subject
            <input value={fbSubject} onChange={(e) => setFbSubject(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }} />
          </label>
          <label className="text-sm block mt-2" style={{ color: "var(--ui-text)" }}>Body (HTML)
            <textarea value={fbHtml} onChange={(e) => setFbHtml(e.target.value)} rows={5} className="block border rounded px-2 py-1 text-sm mt-1 w-full font-mono" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm" style={{ color: "var(--ui-text)" }}>Test to
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="+1..." className="block border rounded px-2 py-1 text-sm mt-1" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }} />
          </label>
          <button type="button" disabled={busy || !body || !testTo} onClick={() => void post(testTo)} className="ui-button ui-button--secondary">Send test</button>
          <button type="button" disabled={busy || !body || !count} onClick={() => void post()} className="ui-button ui-button--primary">{busy ? "Sending..." : `Send to ${count}`}</button>
        </div>
        {msg && <p style={{ color: "var(--ui-text-muted)" }}>{msg}</p>}
      </div>
    </section>
  );
}
function AnalyticsFunnel() {
  const [days, setDays] = useState(90);
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data?: { steps?: FunnelStep[] }; steps?: FunnelStep[] }>(
        "/api/marketing/funnel",
        { params: { days } },
      )
      .then((res) => {
        if (cancelled) return;
        const next = res?.data?.steps ?? res?.steps ?? [];
        setSteps(Array.isArray(next) ? next : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load funnel");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const top = steps[0]?.count ?? 0;

  return (
    <section className="drawer-section">
      <div className="flex items-center justify-between mb-3">
        <div className="drawer-section__title">Application funnel</div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value) || 90)} className="border rounded px-2 py-1 text-sm" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 365 days</option>
        </select>
      </div>
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading funnel…</p>}
      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {!loading && !error && steps.length === 0 && <p style={{ color: "var(--ui-text-muted)" }}>No applications in this period yet.</p>}
      {!loading && !error && steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((s) => {
            const width = top > 0 ? Math.max(2, Math.round((s.count / top) * 100)) : 0;
            return <div key={s.key}><div className="flex items-center justify-between text-sm" style={{ color: "var(--ui-text)" }}><span>{s.label}</span><span style={{ color: "var(--ui-text-muted)" }}>{s.count} · {s.pctOfStart}% of start{s.dropFromPrev > 0 ? ` · −${s.dropFromPrev}% vs prev` : ""}</span></div><div style={{ height: 10, borderRadius: 6, background: "var(--ui-border)", overflow: "hidden", marginTop: 4 }}><div style={{ width: `${width}%`, height: "100%", background: "var(--ui-accent-blue)" }} /></div></div>;
          })}
        </div>
      )}
    </section>
  );
}

// BF_PORTAL_MARKETING_GA4_DISPLAY_v1 — Analytics tab also renders live Google
// BF_PORTAL_SOURCES_v1 - conversion by marketing source from GET /api/marketing/sources.
type SourceRow = { source: string; started: number; submitted: number; conversion: number };
function SourcesPanel() {
  const [days, setDays] = useState(90);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data?: { sources?: SourceRow[] }; sources?: SourceRow[] }>("/api/marketing/sources", { params: { days } })
      .then((res) => {
        if (cancelled) return;
        const next = res?.data?.sources ?? res?.sources ?? [];
        setSources(Array.isArray(next) ? next : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load sources");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);
  const top = sources.reduce((m, s) => Math.max(m, s.started), 1);
  return (
    <section className="drawer-section">
      <div className="flex items-center justify-between mb-3">
        <div className="drawer-section__title">Conversion by source</div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value) || 90)} className="border rounded px-2 py-1 text-sm" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 365 days</option>
        </select>
      </div>
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading sources...</p>}
      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {!loading && !error && sources.length === 0 && <p style={{ color: "var(--ui-text-muted)" }}>No attributed applications in this period yet. Tag campaign links with utm_source to see them here.</p>}
      {!loading && !error && sources.length > 0 && (
        <div className="space-y-2">
          {sources.map((s) => {
            const width = Math.max(2, Math.round((s.started / top) * 100));
            return <div key={s.source}><div className="flex items-center justify-between text-sm" style={{ color: "var(--ui-text)" }}><span>{s.source}</span><span style={{ color: "var(--ui-text-muted)" }}>{s.submitted}/{s.started} submitted &middot; {s.conversion}%</span></div><div style={{ height: 10, borderRadius: 6, background: "var(--ui-border)", overflow: "hidden", marginTop: 4 }}><div style={{ width: `${width}%`, height: "100%", background: "var(--ui-accent-blue)" }} /></div></div>;
          })}
        </div>
      )}
    </section>
  );
}

// Analytics (GA4) traffic from GET /api/marketing/ga4 (respondOk envelope).
type Ga4Row = { dim: string; sessions: number; users: number };
type Ga4Trend = { date: string; sessions: number };
type Ga4Report = {
  configured: boolean;
  days?: number;
  cached?: boolean;
  error?: string;
  summary?: { activeUsers: number; newUsers: number; sessions: number; pageViews: number; avgSessionSec: number; engagementRate?: number; engagedSessions?: number };
  channels?: Ga4Row[];
  sources?: Ga4Row[];
  campaigns?: Ga4Row[];
  adContent?: Ga4Row[];
  events?: Ga4Row[];
  landingPages?: Ga4Row[];
  topPages?: Ga4Row[];
  newVsReturning?: Ga4Row[];
  countries?: Ga4Row[];
  cities?: Ga4Row[];
  browsers?: Ga4Row[];
  operatingSystems?: Ga4Row[];
  devices?: Ga4Row[];
  trend?: Ga4Trend[];
};

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const r = Math.round(sec % 60);
  return `${m}m ${r.toString().padStart(2, "0")}s`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: "1 1 130px", minWidth: 120, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ui-text)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function BarList({ title, rows, unit = "sessions" }: { title: string; rows: Ga4Row[]; unit?: string }) {
  const max = rows.reduce((m, r) => Math.max(m, r.sessions), 0);
  return (
    <section className="drawer-section" style={{ flex: "1 1 320px", minWidth: 280 }}>
      <div className="drawer-section__title">{title}</div>
      {rows.length === 0 && <p style={{ color: "var(--ui-text-muted)" }}>No data in this period.</p>}
      <div className="space-y-2">
        {rows.map((r, i) => {
          const width = max > 0 ? Math.max(2, Math.round((r.sessions / max) * 100)) : 0;
          return (
            <div key={`${r.dim}-${i}`}>
              <div className="flex items-center justify-between text-sm" style={{ color: "var(--ui-text)" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "62%" }} title={r.dim}>{r.dim || "(not set)"}</span>
                <span style={{ color: "var(--ui-text-muted)", whiteSpace: "nowrap" }}>{r.sessions.toLocaleString()} {unit} · {r.users.toLocaleString()} users</span>
              </div>
              <div style={{ height: 8, borderRadius: 6, background: "var(--ui-border)", overflow: "hidden", marginTop: 4 }}>
                <div style={{ width: `${width}%`, height: "100%", background: "var(--ui-accent-blue)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Sparkline({ data }: { data: Ga4Trend[] }) {
  if (!data || data.length === 0) return null;
  const w = 600, h = 56, pad = 4;
  const max = data.reduce((m, d) => Math.max(m, d.sessions), 0) || 1;
  const stepX = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const pts = data.map((d, i) => `${pad + i * stepX},${h - pad - (d.sessions / max) * (h - pad * 2)}`).join(" ");
  return (
    <section className="drawer-section">
      <div className="drawer-section__title">Sessions over time</div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 64 }}>
        <polyline points={pts} fill="none" stroke="var(--ui-accent-blue)" strokeWidth={2} />
      </svg>
      <div className="flex items-center justify-between" style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>
        <span>{data[0]?.date}</span>
        <span>peak {max.toLocaleString()} / day</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </section>
  );
}

function Ga4Panel() {
  const [days, setDays] = useState(90);
  const [report, setReport] = useState<Ga4Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data?: Ga4Report } & Partial<Ga4Report>>("/api/marketing/ga4", { params: { days } })
      .then((res) => {
        if (cancelled) return;
        const r = ((res as any)?.data ?? res) as Ga4Report;
        setReport(r ?? null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const sm = report?.summary;

  return (
    <div className="space-y-4">
      <section className="drawer-section">
        <div className="flex items-center justify-between mb-3">
          <div className="drawer-section__title">Website traffic · Google Analytics</div>
          <select value={days} onChange={(e) => setDays(Number(e.target.value) || 90)} className="border rounded px-2 py-1 text-sm" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
          </select>
        </div>
        {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading analytics…</p>}
        {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
        {!loading && !error && report && !report.configured && (
          <p style={{ color: "var(--ui-text-muted)" }}>Google Analytics isn’t connected on the server yet. Once the GA4 service account is set, live users, sessions, traffic sources, landing pages, geography, and device data will appear here.</p>
        )}
        {!loading && !error && report?.configured && report.error && (
          <p role="alert" style={{ color: "#dc2626" }}>Google Analytics error: {report.error}</p>
        )}
        {!loading && !error && report?.configured && (
          <div className="flex flex-wrap gap-2">
            <StatCard label="Active users" value={(sm?.activeUsers ?? 0).toLocaleString()} />
            <StatCard label="New users" value={(sm?.newUsers ?? 0).toLocaleString()} />
            <StatCard label="Sessions" value={(sm?.sessions ?? 0).toLocaleString()} />
            <StatCard label="Page views" value={(sm?.pageViews ?? 0).toLocaleString()} />
            <StatCard label="Avg. session" value={fmtDuration(sm?.avgSessionSec ?? 0)} />
            <StatCard label="Engaged sessions" value={(sm?.engagedSessions ?? 0).toLocaleString()} />
            <StatCard label="Engagement rate" value={`${sm?.engagementRate ?? 0}%`} />
          </div>
        )}
      </section>
      {!loading && !error && report?.configured && !report.error && (
        <>
          <Sparkline data={report.trend ?? []} />
          <div className="flex flex-wrap gap-3">
            <BarList title="Acquisition channels" rows={report.channels ?? []} />
            <BarList title="Top sources / mediums" rows={report.sources ?? []} />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Campaigns" rows={report.campaigns ?? []} />
            <BarList title="Ad content (utm_content)" rows={report.adContent ?? []} />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Events" rows={report.events ?? []} unit="events" />
            <BarList title="New vs returning" rows={report.newVsReturning ?? []} />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Top landing pages" rows={report.landingPages ?? []} />
            <BarList title="Most viewed pages" rows={report.topPages ?? []} unit="views" />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Countries" rows={report.countries ?? []} />
            <BarList title="Cities" rows={report.cities ?? []} />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Browsers" rows={report.browsers ?? []} />
            <BarList title="Operating systems" rows={report.operatingSystems ?? []} />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Devices" rows={report.devices ?? []} />
          </div>
        </>
      )}
    </div>
  );
}


type ClarityMetric = { metricName: string; rows: Record<string, any>[] };
type ClarityProjectReport = { name: string; dashboardUrl?: string | null; days?: number; cached?: boolean; error?: string; metrics?: ClarityMetric[] };
type ClarityReport = { configured: boolean; days?: number; projects?: ClarityProjectReport[] };

function ClarityPanel() {
  const [report, setReport] = useState<ClarityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError(null);
    api
      .get<{ data?: ClarityReport } & Partial<ClarityReport>>("/api/marketing/clarity", { params: { days: 3 } })
      .then((res) => { if (cancelled) return; const r = ((res as any)?.data ?? res) as ClarityReport; setReport(r ?? null); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load Clarity"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return (
    <section className="drawer-section">
      <div className="drawer-section__title">Behavior · Microsoft Clarity <span style={{ color: "var(--ui-text-muted)", fontWeight: 400, fontSize: 12 }}>· last 3 days</span></div>
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading Clarity…</p>}
      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {!loading && !error && report && !report.configured && (
        <p style={{ color: "var(--ui-text-muted)" }}>Microsoft Clarity isn’t connected on the server yet. Add a Clarity Data Export API token (one per project) and behavior metrics — sessions, engagement, scroll depth, and frustration signals (rage clicks, dead clicks, quick-backs) — will appear here. Heatmaps and session recordings open in the Clarity dashboard.</p>
      )}
      {!loading && !error && report?.configured && (report.projects ?? []).map((proj, pi) => (
        <div key={pi} style={{ marginTop: pi ? 16 : 8 }}>
          <div className="flex items-center justify-between mb-2">
            <div style={{ fontWeight: 600 }}>{proj.name}</div>
            {proj.dashboardUrl && (
              <a href={proj.dashboardUrl} target="_blank" rel="noreferrer" className="ui-button ui-button--secondary" style={{ fontSize: 12 }}>Open heatmaps & recordings →</a>
            )}
          </div>
          {proj.error && <p role="alert" style={{ color: "#dc2626", fontSize: 12 }}>{proj.error}</p>}
          {!proj.error && (proj.metrics ?? []).length === 0 && <p style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>No data in the last 3 days.</p>}
          {!proj.error && (proj.metrics ?? []).length > 0 && (
            <div className="flex flex-wrap gap-3">
              {(proj.metrics ?? []).map((m, i) => (
                <div key={i} style={{ flex: "1 1 240px", minWidth: 220, border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{m.metricName}</div>
                  {(m.rows ?? []).slice(0, 8).map((row, j) => (
                    <div key={j} style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "4px 0", borderTop: j ? "1px solid var(--ui-border)" : "none" }}>
                      {Object.entries(row).map(([k, v]) => (
                        <span key={k} style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>{k}: <strong style={{ color: "var(--ui-text)" }}>{String(v)}</strong></span>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {proj.cached && <p style={{ color: "var(--ui-text-muted)", fontSize: 11, marginTop: 4 }}>Cached — Clarity allows only 10 pulls/day per project.</p>}
        </div>
      ))}
    </section>
  );
}

const MarketingDashboard = () => {
  const [tab, setTab] = useState<MarketingTab>("analytics");
  return <div className="space-y-4"><div className="flex flex-wrap gap-2">{MARKETING_TABS.map((entry) => <button key={entry.id} type="button" className={`ui-button ${tab === entry.id ? "ui-button--primary" : "ui-button--secondary"}`} onClick={() => setTab(entry.id)}>{entry.label}</button>)}</div>{tab === "google-ads" && (<div className="space-y-4"><GoogleAdsPanel /><UtmBuilderPanel /><MayaSuggestionsPanel /><AdsConversionsPanel /><IcpBuilderPanel /></div>)}{tab === "email" && <EmailComposerPanel />}{tab === "sms" && <SmsComposerPanel />}{tab === "linkedin-ads" && (<div className="space-y-4"><LinkedInAdsPanel /><LinkedInSuggestionsPanel /><LinkedInConversionsPanel /><LinkedInAudiencePanel /></div>)}{tab === "analytics" && (<div className="space-y-4"><AnalyticsFunnel /><SourcesPanel /><Ga4Panel /><ClarityPanel /></div>)}</div>;
};

export default MarketingDashboard;
