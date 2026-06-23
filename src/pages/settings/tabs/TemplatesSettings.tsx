// BF_PORTAL_BLOCK_v694_COMMS — Message Templates tab.
// CRUD over /api/templates (server v693). Channels: email | message | sms.
// Tokens {{first_name}} and {{meeting_link}} are substituted at compose time.
import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import api from "@/api";
import { getErrorMessage } from "@/utils/errors";

type Channel = "email" | "message" | "sms";

type Template = {
  id: string;
  channel: Channel;
  name: string;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  shared: boolean;
  owner_user_id: string | null;
  created_at?: string;
  updated_at?: string;
};

const EMPTY: Omit<Template, "id"> = {
  channel: "email",
  name: "",
  subject: "",
  body_html: "",
  body_text: "",
  shared: true,
  owner_user_id: null,
};

// Merge tokens available in templates. first_name/last_name/full_name/name/email
// are filled from the recipient's contact record at send time; meeting_link is
// replaced with the booking button (email) at send time.
const TOKENS: { token: string; label: string }[] = [
  { token: "{{first_name}}", label: "First name" },
  { token: "{{last_name}}", label: "Last name" },
  { token: "{{full_name}}", label: "Full name" },
  { token: "{{name}}", label: "Full name (alt)" },
  { token: "{{email}}", label: "Email address" },
  { token: "{{meeting_link}}", label: "Booking link / button" },
];

export default function TemplatesSettings() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<(Omit<Template, "id"> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get<any>("/api/templates")
      .then((rows) => {
        setTemplates(Array.isArray(rows) ? rows : (rows?.items ?? []));
        setLoaded(true);
      })
      .catch((e) => {
        setError(getErrorMessage(e, "Unable to load templates."));
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      channel: editing.channel,
      name: editing.name.trim(),
      subject: editing.subject ?? "",
      body_html: editing.channel === "email" ? editing.body_html ?? "" : null,
      body_text: editing.channel === "email" ? null : editing.body_text ?? "",
      shared: editing.shared,
    };
    try {
      if (editing.id) {
        await api.put(`/api/templates/${editing.id}`, payload);
      } else {
        await api.post("/api/templates", payload);
      }
      setEditing(null);
      load();
    } catch (e) {
      setError(getErrorMessage(e, "Save failed."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api.delete(`/api/templates/${id}`);
      load();
    } catch (e) {
      setError(getErrorMessage(e, "Delete failed."));
    }
  }

  return (
    <div className="settings-panel" aria-label="Message templates">
      <h2 style={{ margin: "0 0 4px 0" }}>Templates</h2>
      <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#6b7280" }}>
        Reusable email, message, and SMS templates. Use tokens{" "}
        <code>{"{{first_name}}"}</code> and <code>{"{{meeting_link}}"}</code> — they are filled in
        automatically when you pick a template in the composer.
      </p>

      {error && <div style={{ color: "#b00020", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {!editing && (
        <Button type="button" onClick={() => setEditing({ ...EMPTY })}>
          New template
        </Button>
      )}

      {editing && (
        <div style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ fontSize: 13 }}>
              Channel
              <br />
              <select
                value={editing.channel}
                onChange={(e) => setEditing({ ...editing, channel: e.target.value as Channel })}
                style={{ padding: 8, borderRadius: 6, border: "1px solid var(--ui-border)", marginTop: 4 }}
              >
                <option value="email">Email</option>
                <option value="message">Message</option>
                <option value="sms">SMS</option>
              </select>
            </label>
            <label style={{ fontSize: 13, flex: 1, minWidth: 200 }}>
              Name
              <br />
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--ui-border)", marginTop: 4 }}
              />
            </label>
          </div>

          {editing.channel === "email" && (
            <label style={{ fontSize: 13 }}>
              Subject
              <br />
              <input
                type="text"
                value={editing.subject ?? ""}
                onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--ui-border)", marginTop: 4 }}
              />
            </label>
          )}

          <label style={{ fontSize: 13 }}>
            Insert token
            <br />
            <select
              value=""
              onChange={(e) => {
                const tok = e.target.value;
                e.target.value = "";
                if (!tok) return;
                setEditing((prev) => {
                  if (!prev) return prev;
                  if (prev.channel === "email") {
                    const cur = prev.body_html ?? "";
                    return { ...prev, body_html: cur + (cur && !cur.endsWith(" ") && !cur.endsWith("\n") ? " " : "") + tok };
                  }
                  const cur = prev.body_text ?? "";
                  return { ...prev, body_text: cur + (cur && !cur.endsWith(" ") && !cur.endsWith("\n") ? " " : "") + tok };
                });
              }}
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--ui-border)", marginTop: 4, fontFamily: "inherit", fontSize: 13, background: "var(--ui-surface-strong)" }}
            >
              <option value="">Insert a token…</option>
              {TOKENS.map((t) => (
                <option key={t.token} value={t.token}>{t.label} — {t.token}</option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 13 }}>
            Body
            <br />
            <textarea
              rows={8}
              value={(editing.channel === "email" ? editing.body_html : editing.body_text) ?? ""}
              onChange={(e) =>
                setEditing(
                  editing.channel === "email"
                    ? { ...editing, body_html: e.target.value }
                    : { ...editing, body_text: e.target.value }
                )
              }
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--ui-border)", marginTop: 4, fontFamily: "inherit", fontSize: 13 }}
            />
          </label>

          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={editing.shared}
              onChange={(e) => setEditing({ ...editing, shared: e.target.checked })}
            />
            Shared with all staff (uncheck to keep personal)
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save template"}
            </Button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              style={{ padding: "8px 14px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {!loaded ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>Loading…</p>
        ) : templates.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>No templates yet.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {templates.map((t) => (
              <li
                key={t.id}
                style={{ border: "1px solid var(--ui-surface-muted)", borderRadius: 6, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
              >
                <span style={{ fontSize: 14 }}>
                  <strong>{t.name}</strong>{" "}
                  <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
                    · {t.channel}
                    {t.shared ? " · shared" : " · personal"}
                  </span>
                </span>
                <span style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: t.id,
                        channel: t.channel,
                        name: t.name,
                        subject: t.subject ?? "",
                        body_html: t.body_html ?? "",
                        body_text: t.body_text ?? "",
                        shared: t.shared,
                        owner_user_id: t.owner_user_id,
                      })
                    }
                    style={{ padding: "4px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", cursor: "pointer", fontSize: 13 }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(t.id)}
                    style={{ padding: "4px 10px", border: "1px solid #f0c4c4", borderRadius: 6, background: "var(--ui-surface-strong)", color: "#b00020", cursor: "pointer", fontSize: 13 }}
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
