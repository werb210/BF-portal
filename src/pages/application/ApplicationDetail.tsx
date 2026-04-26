import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import OfferUploader from "@/components/offers/OfferUploader";
import ChatPanel from "@/components/chat/ChatPanel";
import { useParams } from "react-router-dom";

const API_PREFIX = "";
const tabs = ["Application", "Banking Analysis", "Financials", "Documents", "Credit Summary", "Notes", "Lenders"] as const;

type TabName = (typeof tabs)[number];

type LenderMatch = {
  lender: string;
  likelihood: number;
  termSheet?: string;
};

const defaultMatches: LenderMatch[] = [
  { lender: "Lender A", likelihood: 84 },
  { lender: "Lender B", likelihood: 72 }
];

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg"
]);
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

const ApplicationDetail = ({ applicationId: propId }: { applicationId?: string }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const applicationId = propId ?? paramId ?? "";
  const [activeTab, setActiveTab] = useState<TabName>("Application");
  const [selectedLenders, setSelectedLenders] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<string>("");
  const [contacts, setContacts] = useState<any[]>([]);

  const handleDocAction = async (status: "accepted" | "rejected") => {
    const reason = status === "rejected" ? window.prompt("Rejection reason") : "Accepted";
    if (!reason) return;
    await api.post(`${API_PREFIX}/applications/${applicationId}/documents/review`, { status, reason, notifyChannels: ["sms", "portal"] });
  };

  const sendSelected = async () => {
    const lenders = Object.entries(selectedLenders)
      .filter(([, selected]) => selected)
      .map(([lender]) => lender);
    await api.post("/api/lender-submissions", { applicationId, lenders });
  };



  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    api.get<any[]>(`/api/applications/${applicationId}/contacts`)
      .then((r) => !cancelled && setContacts(Array.isArray(r) ? r : []))
      .catch(() => !cancelled && setContacts([]));
    return () => { cancelled = true; };
  }, [applicationId]);

  const contactsByRole = useMemo(() => ({
    primary: contacts.filter((c) => c?.is_primary_applicant || String(c?.role ?? "").toLowerCase() === "applicant"),
    partners: contacts.filter((c) => String(c?.role ?? "").toLowerCase() === "partner"),
    guarantors: contacts.filter((c) => String(c?.role ?? "").toLowerCase() === "guarantor"),
    other: contacts.filter((c) => !["applicant", "partner", "guarantor"].includes(String(c?.role ?? "").toLowerCase()) && !c?.is_primary_applicant),
  }), [contacts]);

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      setUploadError("Invalid file type. Allowed: PDF, DOCX, XLSX, PNG, JPG.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setUploadError("File is too large. Max size is 25 MB.");
      event.target.value = "";
      return;
    }
    setUploadError("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-auto">
        {tabs.map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Documents" ? (
        <div className="space-x-2">
          <button type="button">View</button>
          <button type="button">Download</button>
          <button type="button" onClick={() => void handleDocAction("accepted")}>Accept</button>
          <button type="button" onClick={() => void handleDocAction("rejected")}>Reject</button>
        </div>
      ) : null}

      {activeTab === "Lenders" ? (
        <div className="space-y-2">
          <table>
            <thead>
              <tr><th>Likelihood %</th><th>Lender</th><th>Send</th><th>Upload Term Sheet</th></tr>
            </thead>
            <tbody>
              {defaultMatches.map((match) => (
                <tr key={match.lender}>
                  <td>{match.likelihood}%</td>
                  <td>{match.lender}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedLenders[match.lender])}
                      onChange={(event) => setSelectedLenders((prev) => ({ ...prev, [match.lender]: event.target.checked }))}
                    />
                  </td>
                  <td><input type="file" onChange={handleFileSelection} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {uploadError ? <div role="alert">{uploadError}</div> : null}
          <button type="button" onClick={() => void sendSelected()}>Send Selected</button>
        </div>
      ) : null}


      <section style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Contacts</h3>
        {[
          ["Primary Applicant", contactsByRole.primary],
          ["Partners", contactsByRole.partners],
          ["Guarantors", contactsByRole.guarantors],
          ["Other", contactsByRole.other],
        ].map(([label, rows]) => (
          <div key={String(label)} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>{String(label)}</div>
            {(rows as any[]).length === 0 ? <div style={{ color: "#94a3b8", fontSize: 13 }}>—</div> : (rows as any[]).map((c) => (
              <div key={c.id} style={{ fontSize: 14, marginBottom: 4 }}>
                {c.name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()} {c.email ? `• ${c.email}` : ""} {c.phone ? `• ${c.phone}` : ""}
              </div>
            ))}
          </div>
        ))}
      </section>

      {activeTab === "Notes" ? <ChatPanel applicationId={applicationId} /> : null}
      {activeTab === "Financials" ? <OfferUploader applicationId={applicationId} /> : null}
    </div>
  );
};

export default ApplicationDetail;
