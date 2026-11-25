// BF_PORTAL_v849_KS_SILO - Keystone dashboard: GET /api/ops/dashboard (+ GET /api/ops/watchlist).
// BF_PORTAL_SILO_DASHBOARDS_v1 - a movable board (see SiloBoard): each block is a card that can be moved, resized,
// removed and added back. The figures still come from KS-Ops; only the layout (and the Keystone email flows card,
// which is a BF-Server CRM flow) come from BF-Server.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import SiloBoard, { cardLink, FlowsTable, MUTED, Num, numGrid, type BoardSection, type FlowRow } from "@/pages/dashboard/SiloBoard";
import TeamMessagesCard from "@/pages/dashboard/TeamMessagesCard";
import { ksApi } from "./ksApi";
import { Badge, Button, confirmAction, date, ErrorBox, Loading, money } from "./ksUi";
import { isInternalCode } from "@/utils/labels";

function useKsFlows() {
  const [flows, setFlows] = useState<FlowRow[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    api<{ flows?: FlowRow[] }>("/api/crm/flows", { headers: { "X-Silo": "KS" } } as any)
      .then((r) => setFlows(Array.isArray(r?.flows) ? r.flows : []))
      .catch(() => setError(true));
  }, []);
  return { flows, error };
}

export default function KsDashboard() {
  const dash = useQuery({ queryKey: ["ks", "dashboard"], queryFn: ksApi.dashboard });
  const watch = useQuery({ queryKey: ["ks", "watchlist"], queryFn: ksApi.watchlist });
  const backfill = useMutation({ mutationFn: ksApi.pgiBackfill });
  const flows = useKsFlows();

  if (dash.isLoading) return <Loading what="the Keystone dashboard" />;
  if (dash.error || !dash.data) return <ErrorBox error={dash.error ?? new Error("No dashboard data.")} />;
  const d = dash.data;
  const cur = d.currency || "CAD";
  const statuses = Object.entries(d.by_status ?? {}).sort((a, b) => b[1] - a[1]);

  const sections: BoardSection[] = [
    {
      key: "ks_dash_kpis", title: "Key numbers", size: "full", description: "MRR, licensees, seats, past due, open tickets and requests.",
      render: () => (
        <div style={numGrid}>
          <Num label="MRR" value={money(d.mrr, cur)} hint="Active and past-due licensees" />
          <Num label="Licensees" value={d.licensees} hint={`${d.trials_active} on trial`} />
          <Num label="Seats" value={d.seats} hint="Trial, active and past due" />
          <Num label="Past due" value={d.past_due} tone={d.past_due > 0 ? "warn" : undefined} hint={`${d.overdue_invoices} overdue invoices, ${money(d.overdue_amount, cur)}`} />
          <Num label="Open tickets" value={<Link to="/silo/ks/crm/support" style={cardLink}>{d.open_tickets}</Link>} hint="Open or waiting" />
          <Num label="Open requests" value={<Link to="/silo/ks/requests" style={cardLink}>{d.open_requests}</Link>} hint="Upgrade and storage" />
        </div>
      ),
    },
    {
      key: "ks_dash_status", title: "Licensees by status", size: "half", description: "How many licensees are in each status.",
      render: () => statuses.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {statuses.map(([status, n]) => (
            <Link key={status} to={`/silo/ks/crm/licensees?status=${status}`} style={{ textDecoration: "none", display: "inline-flex", gap: 6, alignItems: "center", color: "inherit" }}>
              <Badge value={status} /> <strong>{n}</strong>
            </Link>
          ))}
        </div>
      ) : <p style={{ margin: 0, color: MUTED }}>No licensees yet.</p>,
    },
    {
      key: "ks_dash_watchlist", title: "Shared fraud watchlist", size: "half", description: "Licensees sharing, files and entries.",
      render: () => watch.error ? <ErrorBox error={watch.error} /> : watch.data ? (
        <p style={{ margin: 0 }}>{watch.data.opted_in_licensees} licensees sharing, {watch.data.files} files, {watch.data.entries} entries.</p>
      ) : <Loading what="watchlist totals" />,
    },
    {
      key: "ks_dash_flows", title: "Email flows", size: "full", description: "People in each Keystone email flow, emailed, opened and clicked.",
      render: () => <FlowsTable flows={flows.flows} error={flows.error} />,
    },
    {
      key: "ks_dash_purges", title: `Data purges (${d.data_purges_due} due)`, size: "full", description: "Cancelled licensees and when their data is purged.",
      render: () => d.data_purges?.length ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Licensee", "Cancelled", "Purge on", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: "4px 6px", color: MUTED }}>{h}</th>)}</tr></thead>
          <tbody>
            {d.data_purges.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid #E4EAF2" }}>
                <td style={{ padding: 6 }}><Link to={`/silo/ks/crm/licensees/${p.id}`} style={cardLink}>{p.company_name}</Link>{p.company_code && !isInternalCode(p.company_code) ? ` (${p.company_code})` : ""}</td>
                <td style={{ padding: 6 }}>{date(p.cancelled_at)}</td>
                <td style={{ padding: 6 }}>{p.data_purge_on}</td>
                <td style={{ padding: 6 }}>{p.due ? <><Badge value="past_due" /> Due</> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{ margin: 0, color: MUTED }}>No data purges scheduled.</p>,
    },
    {
      key: "ks_dash_pgi", title: "PGI referral sources", size: "half", description: "Every live licensee linked to Boreal Risk Management.",
      render: () => (
        <div>
          <p style={{ margin: "0 0 8px", color: MUTED, fontSize: 13 }}>Every live licensee is a PGI referral source at Boreal Risk Management; the link is refreshed automatically every 5 minutes.</p>
          <Button disabled={backfill.isPending} onClick={() => { void confirmAction("Link every live licensee to Boreal Risk Management again (fresh PGI referral credentials) on the next pass?").then((ok) => { if (ok) backfill.mutate(); }); }}>Relink all live licensees</Button>
          {backfill.error ? <ErrorBox error={backfill.error} /> : null}
          {backfill.data ? <p style={{ margin: "8px 0 0" }}>{backfill.data.queued} licensees queued for relinking.</p> : null}
        </div>
      ),
    },
    { key: "dash_team", title: "New team messages", size: "full", description: "Team conversations with unread messages.", standard: false, render: () => <TeamMessagesCard /> },
  ];

  const actions = (
    <>
      <Link to="/silo/ks/crm/licensees" style={{ fontWeight: 600, textDecoration: "underline", color: "inherit" }}>Licensees</Link>
      <Link to="/silo/ks/crm/support" style={{ fontWeight: 600, textDecoration: "underline", color: "inherit" }}>Support</Link>
      <Link to="/silo/ks/requests" style={{ fontWeight: 600, textDecoration: "underline", color: "inherit" }}>Requests</Link>
    </>
  );
  return <SiloBoard silo="KS" title="Keystone operations" sections={sections} actions={actions} />;
}
