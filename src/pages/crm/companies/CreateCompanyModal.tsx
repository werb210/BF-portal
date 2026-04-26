import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "@/api";
import ModalFooterWithDelete from "@/components/ModalFooterWithDelete";

const financingOptions = ["Equipment", "Working Capital", "Real Estate", "Invoice", "Line of Credit"];

type User = { id: string; first_name?: string; last_name?: string; name?: string };

export default function CreateCompanyModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [typesOfFinancing, setTypesOfFinancing] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [notes, setNotes] = useState("");
  const [owners, setOwners] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get<{ users?: User[] } | User[]>("/api/users")
      .then((r) => setOwners(Array.isArray(r) ? r : (r.users ?? [])))
      .catch(() => setOwners([]));
  }, []);

  const ownerOptions = useMemo(() => owners.map((o) => ({ id: o.id, label: o.name || `${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.id })), [owners]);

  const save = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Company name is required";
    if (name.length > 200) next.name = "Company name must be 200 characters or fewer";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api.post("/api/companies", {
        name: name.trim(),
        industry: industry.trim() || undefined,
        typesOfFinancing,
        ownerId: ownerId || null,
        notes: notes.trim() || undefined,
      });
      try {
        if (typeof window !== "undefined" && typeof window.alert === "function") {
          window.alert("Company created successfully");
        }
      } catch {}
      onSaved?.();
      onClose();
    } catch (e: any) {
      if (e?.status === 400 && e?.data?.errors && typeof e.data.errors === "object") {
        setErrors(e.data.errors as Record<string, string>);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ marginTop: 0 }}>Create Company</h3>
        <label style={field}><span>Company name</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} /></label>
        {errors.name && <div style={err}>{errors.name}</div>}
        <label style={field}><span>Industry</span><input value={industry} onChange={(e) => setIndustry(e.target.value)} /></label>
        <div style={field}><span>Types of financing</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{financingOptions.map((opt) => (
            <label key={opt} style={{ fontSize: 13 }}><input type="checkbox" checked={typesOfFinancing.includes(opt)} onChange={(e) => setTypesOfFinancing((prev) => e.target.checked ? [...prev, opt] : prev.filter((v) => v !== opt))} /> {opt}</label>
          ))}</div>
        </div>
        <label style={field}><span>Owner</span>
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">—</option>
            {ownerOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label style={field}><span>Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} /></label>

        <ModalFooterWithDelete onCancel={onClose} onSave={() => void save()} onDelete={undefined} saveLabel={saving ? "Saving…" : "Save"} saveDisabled={saving} />
      </div>
    </div>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "grid", placeItems: "center", zIndex: 50 };
const modal: CSSProperties = { width: "min(560px, 90vw)", background: "#fff", borderRadius: 12, padding: 16 };
const field: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 };
const err: CSSProperties = { color: "#b00020", fontSize: 12, marginBottom: 8 };
