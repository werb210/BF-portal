import { useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import api from "@/api/client";
import { Navigate } from "react-router-dom";
import CapitalScorePreview from "@/components/CapitalScorePreview";

const API_PREFIX = "";
type Contact = { id: string; company: string; firstName: string; lastName: string; email: string; phone: string; createdAt: string };
type Issue = { id: string; message: string; screenshotBase64?: string; status: string; createdAt: string };
type ChatEscalation = { id: string; name: string; email: string; transcript: string; status: string; createdAt: string };

export default function Operations() {
  const auth = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [chats, setChats] = useState<ChatEscalation[]>([]);
  const [issueFilter, setIssueFilter] = useState("ALL");

  if (auth.status !== "authenticated" || auth.user.role !== "Admin") {
    return <Navigate to="/" replace />;
  }

  async function refreshData() {
    const [contactsRes, issuesRes, chatsRes] = await Promise.all([
      api.get<Contact[]>("/admin/contacts"),
      api.get<Issue[]>("/admin/issues"),
      api.get<ChatEscalation[]>("/admin/chats"),
    ]);

    setContacts(contactsRes.success ? contactsRes.data : []);
    setIssues(issuesRes.success ? issuesRes.data : []);
    setChats(chatsRes.success ? chatsRes.data : []);
  }

  async function updateIssueStatus(id: string, status: string) {
    const updateRes = await api.patch(`${API_PREFIX}/admin/issues/${id}`, { status });
    if (!updateRes.success) {
      throw new Error(updateRes.message);
    }

    await refreshData();
  }

  useEffect(() => {
    void refreshData();
  }, []);

  return <div style={{ padding: 24 }}><h1>Operations Dashboard</h1><section><h2>Capital Readiness Preview</h2><CapitalScorePreview /></section><section><h2>New Contacts</h2>{contacts.map((c) => <div key={c.id} style={{ border: "1px solid #e5e7eb", padding: 16, borderRadius: 8, marginBottom: 16 }}><strong>{c.company}</strong> — {c.firstName} {c.lastName}<div>{c.email} | {c.phone}</div></div>)}</section><section><h2>Issue Reports</h2><label htmlFor="statusFilter" className="sr-only">Filter by status</label><select id="statusFilter" onChange={(e) => setIssueFilter(e.target.value)}><option value="ALL">All</option><option value="OPEN">Open</option><option value="IN_PROGRESS">In Progress</option><option value="CLOSED">Closed</option></select>{[...issues].filter((i) => issueFilter === "ALL" || i.status === issueFilter).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((i) => <div key={i.id} style={{ border: "1px solid #e5e7eb", padding: 16, borderRadius: 8, marginBottom: 16 }}><p>{i.message}</p>{i.screenshotBase64 && <img src={`data:image/png;base64,${i.screenshotBase64}`} alt="Operations overview graphic" style={{ maxWidth: 400 }} />}<div>Status: {i.status}</div><button onClick={() => void updateIssueStatus(i.id, "IN_PROGRESS")}>Start</button><button onClick={() => void updateIssueStatus(i.id, "CLOSED")}>Close</button></div>)}</section><section><h2>Chat Escalations</h2>{chats.map((chat) => <div key={chat.id} style={{ border: "1px solid #e5e7eb", padding: 16, borderRadius: 8, marginBottom: 16 }}><strong>{chat.name} ({chat.email})</strong><pre>{chat.transcript}</pre></div>)}</section></div>;
}
