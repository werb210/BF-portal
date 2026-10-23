// BF_PORTAL_v849_KS_SILO - Keystone dashboard: GET /api/ops/dashboard (+ GET /api/ops/watchlist).
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ksApi } from "./ksApi";
import { Badge, Button, confirmAction, date, ErrorBox, linkStyle, Loading, money, PageTitle, Section, Stat, Table, td } from "./ksUi";

export default function KsDashboard() {
  const dash = useQuery({ queryKey: ["ks", "dashboard"], queryFn: ksApi.dashboard });
  const watch = useQuery({ queryKey: ["ks", "watchlist"], queryFn: ksApi.watchlist });
  const backfill = useMutation({ mutationFn: ksApi.pgiBackfill });

  if (dash.isLoading) return <Loading what="the Keystone dashboard" />;
  if (dash.error || !dash.data) return <ErrorBox error={dash.error ?? new Error("No dashboard data.")} />;
  const d = dash.data;
  const statuses = Object.entries(d.by_status ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <PageTitle
        actions={
          <>
            <Link to="/silo/ks/licensees" style={linkStyle}>Licensees</Link>
            <Link to="/silo/ks/tickets" style={linkStyle}>Support</Link>
            <Link to="/silo/ks/requests" style={linkStyle}>Requests</Link>
          </>
        }
      >
        Keystone operations
      </PageTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Stat title="MRR" value={money(d.mrr, d.currency || "CAD")} sub="Active and past-due licensees" />
        <Stat title="Licensees" value={d.licensees} sub={`${d.trials_active} on trial`} />
        <Stat title="Seats" value={d.seats} sub="Trial, active and past due" />
        <Stat title="Past due" value={d.past_due} sub={`${d.overdue_invoices} overdue invoices, ${money(d.overdue_amount, d.currency || "CAD")}`} />
        <Stat title="Open tickets" value={<Link to="/silo/ks/tickets" style={linkStyle}>{d.open_tickets}</Link>} sub="Open or waiting" />
        <Stat title="Open requests" value={<Link to="/silo/ks/requests" style={linkStyle}>{d.open_requests}</Link>} sub="Upgrade and storage" />
      </div>

      <Section title="Licensees by status">
        {statuses.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {statuses.map(([status, n]) => (
              <Link key={status} to={`/silo/ks/licensees?status=${status}`} style={{ textDecoration: "none", display: "inline-flex", gap: 6, alignItems: "center", color: "var(--ui-text)" }}>
                <Badge value={status} /> <strong>{n}</strong>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: "var(--ui-text-muted)" }}>No licensees yet.</p>
        )}
      </Section>

      <Section title={`Data purges (${d.data_purges_due} due)`}>
        <Table head={["Licensee", "Cancelled", "Purge on", ""]} empty={!d.data_purges?.length}>
          {(d.data_purges ?? []).map((p) => (
            <tr key={p.id}>
              <td style={td}>
                <Link to={`/silo/ks/licensees/${p.id}`} style={linkStyle}>{p.company_name}</Link> ({p.company_code})
              </td>
              <td style={td}>{date(p.cancelled_at)}</td>
              <td style={td}>{p.data_purge_on}</td>
              <td style={td}>{p.due ? <Badge value="past_due" /> : null}{p.due ? " Due" : ""}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Shared fraud watchlist">
        {watch.error ? (
          <ErrorBox error={watch.error} />
        ) : watch.data ? (
          <p style={{ margin: 0 }}>
            {watch.data.opted_in_licensees} licensees sharing, {watch.data.files} files, {watch.data.entries} entries.
          </p>
        ) : (
          <Loading what="watchlist totals" />
        )}
      </Section>

      <Section
        title="PGI referral sources"
        actions={
          <Button
            disabled={backfill.isPending}
            onClick={() => {
              if (confirmAction("Link every live licensee to Boreal Insurance again (fresh PGI referral credentials) on the next pass?")) backfill.mutate();
            }}
          >
            Relink all live licensees
          </Button>
        }
      >
        <p style={{ margin: 0, color: "var(--ui-text-muted)" }}>
          Every live licensee is a PGI referral source at Boreal Insurance; the link is refreshed automatically every 5 minutes.
        </p>
        {backfill.error ? <ErrorBox error={backfill.error} /> : null}
        {backfill.data ? <p style={{ margin: "8px 0 0" }}>{backfill.data.queued} licensees queued for relinking.</p> : null}
      </Section>
    </div>
  );
}
