import { useMemo, useState } from "react";
import { useDialerStore } from "@/state/dialer.store";

const STAGE_COLORS: Record<string, string> = {
  Received: "#60a5fa",
  "In Review": "#f59e0b",
  "Documents Required": "#f97316",
  "Additional Steps Required": "#a78bfa",
  "Off to Lender": "#22c55e",
  Offer: "#14b8a6"
};

type ApplicationOverviewTabProps = {
  application: unknown;
};

const formatCurrency = (value: unknown) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (value: unknown) => {
  if (!value) return "—";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
};

export default function ApplicationOverviewTab({ application }: ApplicationOverviewTabProps) {
  const [quickNote, setQuickNote] = useState("");
  const openDialer = useDialerStore((state) => state.openDialer);

  const view = useMemo(() => {
    const record = (application ?? {}) as Record<string, unknown>;
    const stage = String(record.current_stage ?? record.stage ?? "Received");
    const docsAccepted = Number(record.acceptedDocumentCount ?? 0);
    const docsTotal = Number(record.documentCount ?? 0);
    const stageEnteredAt = record.stageEnteredAt ?? record.stage_entered_at ?? record.updatedAt;
    const daysInStage = stageEnteredAt
      ? Math.max(0, Math.floor((Date.now() - new Date(String(stageEnteredAt)).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      stage,
      amount: formatCurrency(record.requestedAmount ?? record.amount),
      productType: String(record.productType ?? record.product_type ?? "—"),
      submittedAt: formatDate(record.submittedAt ?? record.createdAt ?? record.created_at),
      assignedTo: String(record.assignedStaffName ?? record.ownerName ?? record.assigned_to ?? "Unassigned"),
      docsAccepted,
      docsTotal,
      daysInStage,
      clientPhone: String(record.clientPhone ?? record.phone ?? "")
    };
  }, [application]);

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 999,
            padding: "6px 12px",
            fontWeight: 600,
            fontSize: 12,
            background: STAGE_COLORS[view.stage] ?? "#334155",
            color: "#fff"
          }}
        >
          {view.stage}
        </span>
        <button
          type="button"
          className="ui-button ui-button--secondary"
          onClick={() =>
            openDialer({
              phone: view.clientPhone,
              applicationId: String((application as { id?: string })?.id ?? ""),
              applicationName: String((application as { businessName?: string })?.businessName ?? "")
            })
          }
          disabled={!view.clientPhone}
        >
          Call Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="drawer-section">
          <div className="drawer-section__title">Amount + Product</div>
          <div>{view.amount}</div>
          <div className="text-sm text-slate-500">{view.productType}</div>
        </div>
        <div className="drawer-section">
          <div className="drawer-section__title">Submission</div>
          <div>{view.submittedAt}</div>
          <div className="text-sm text-slate-500">Assigned to {view.assignedTo}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="drawer-section">
          <div className="drawer-section__title">Documents</div>
          <div>{view.docsAccepted}/{view.docsTotal} accepted</div>
        </div>
        <div className="drawer-section">
          <div className="drawer-section__title">Current Stage</div>
          <div>{view.daysInStage} day(s)</div>
        </div>
      </div>

      <div className="drawer-section">
        <div className="drawer-section__title">Quick Note</div>
        <textarea
          value={quickNote}
          onChange={(event) => setQuickNote(event.target.value)}
          placeholder="Add a quick internal note"
          style={{ width: "100%", minHeight: 96, padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
        />
      </div>
    </div>
  );
}
