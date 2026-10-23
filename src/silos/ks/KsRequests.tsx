// BF_PORTAL_v849_KS_SILO - upgrade and storage requests from licensees: GET /api/ops/requests (?status=),
// PATCH /api/ops/requests/:id { status: open | done | declined }. Marking a request done does not change the plan:
// change it on the licensee's page first.
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KS_REQUEST_STATUSES, ksApi, type KsRequest } from "./ksApi";
import { Badge, Button, confirmAction, date, ErrorBox, input, label, linkStyle, Loading, PageTitle, Table, td } from "./ksUi";

function describe(r: KsRequest): string {
  const parts: string[] = [];
  if (r.requested_plan) parts.push(`${label(r.current_plan)} -> ${label(r.requested_plan)}`);
  if (r.requested_extra_storage_blocks) parts.push(`${r.requested_extra_storage_blocks} x 50 GB storage`);
  return parts.join(", ") || "-";
}

export default function KsRequests() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "open";
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["ks", "requests", status], queryFn: () => ksApi.requests(status === "all" ? "" : status) });
  const update = useMutation({
    mutationFn: (v: { id: string; status: string }) => ksApi.updateRequest(v.id, v.status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ks", "requests"] });
      void qc.invalidateQueries({ queryKey: ["ks", "dashboard"] });
    },
  });
  const act = (r: KsRequest, next: string, verb: string) => {
    const extra = next === "done" ? "\n\nThis only closes the request. Change the plan or storage on the licensee's page." : "";
    if (confirmAction(`${verb} the ${label(r.kind).toLowerCase()} request from ${r.company_name ?? "this licensee"}?${extra}`)) update.mutate({ id: r.id, status: next });
  };
  const rows = list.data?.requests ?? [];

  return (
    <div>
      <PageTitle>Upgrade and storage requests</PageTitle>
      <div style={{ marginBottom: 12 }}>
        <select
          aria-label="Request status filter"
          style={input}
          value={status}
          onChange={(e) => {
            const p = new URLSearchParams(params);
            p.set("status", e.target.value);
            setParams(p, { replace: true });
          }}
        >
          <option value="all">All</option>
          {KS_REQUEST_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      </div>
      {update.error ? <ErrorBox error={update.error} /> : null}
      {list.isLoading ? <Loading what="requests" /> : null}
      {list.error ? <ErrorBox error={list.error} /> : null}
      {list.data ? (
        <Table head={["Licensee", "Kind", "Requested", "By", "Message", "Status", "Created", ""]} empty={!rows.length}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={td}><Link to={`/silo/ks/licensees/${r.licensee_id}`} style={linkStyle}>{r.company_name ?? r.licensee_id}</Link></td>
              <td style={td}>{label(r.kind)}</td>
              <td style={td}>{describe(r)}</td>
              <td style={td}>{r.requested_by ?? "-"}</td>
              <td style={{ ...td, maxWidth: 280, whiteSpace: "pre-wrap" }}>{r.message ?? "-"}</td>
              <td style={td}><Badge value={r.status} />{r.handled_by ? <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{r.handled_by}</div> : null}</td>
              <td style={td}>{date(r.created_at)}</td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>
                {r.status === "open" ? (
                  <span style={{ display: "inline-flex", gap: 6 }}>
                    <Button kind="primary" disabled={update.isPending} onClick={() => act(r, "done", "Approve and close")}>Approve</Button>
                    <Button disabled={update.isPending} onClick={() => act(r, "declined", "Decline")}>Decline</Button>
                  </span>
                ) : (
                  <Button disabled={update.isPending} onClick={() => act(r, "open", "Reopen")}>Reopen</Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      ) : null}
    </div>
  );
}
