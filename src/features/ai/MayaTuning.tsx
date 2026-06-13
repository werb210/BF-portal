// MAYA_TUNING — voice + persona tuning and a test panel (browser TTS preview + nova playback).
import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";
import Button from "@/components/ui/Button";
import { sendMayaMessage } from "@/api/maya";
import { getAuthToken } from "@/lib/authToken";
import { resolveApiBase } from "@/config/api";

const VOICES = ["nova", "shimmer", "alloy", "echo", "fable", "onyx"];

export default function MayaTuning() {
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [testText, setTestText] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await api<{ config?: Record<string, string> }>("/api/settings/maya-config");
        setCfg(r.config ?? {});
      } catch {
        setErr("Could not load Maya config.");
      }
    })();
  }, []);

  function set(key: string, value: string) {
    setCfg((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/settings/maya-config", { method: "PUT", body: JSON.stringify(cfg) });
      setSaved(true);
    } catch {
      setErr("Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runTest() {
    const t = testText.trim();
    if (!t) return;
    setTesting(true);
    setReply(null);
    try {
      const res = await sendMayaMessage(t);
      setReply(typeof res.reply === "string" ? res.reply : "(no reply)");
    } catch {
      setReply("Maya is unreachable right now.");
    } finally {
      setTesting(false);
    }
  }

  function speakBrowser(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setErr("Speech synthesis isn't supported in this browser.");
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    const rate = parseFloat(cfg["maya.voice_rate"] ?? "1");
    const pitch = parseFloat(cfg["maya.voice_pitch"] ?? "1");
    if (!Number.isNaN(rate)) u.rate = rate;
    if (!Number.isNaN(pitch)) u.pitch = pitch;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  async function playNova(text: string) {
    try {
      const path = "/api/settings/maya-tts";
      const base = resolveApiBase(path);
      const token = getAuthToken();
      const resp = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) {
        setErr("Nova playback unavailable (check OPENAI_API_KEY on the server).");
        return;
      }
      const blob = await resp.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      void audio.play();
    } catch {
      setErr("Nova playback failed.");
    }
  }

  const inputStyle: CSSProperties = {
    width: "100%", background: "#ffffff", color: "#000000",
    border: "1px solid #cbd6e2", borderRadius: 4, padding: 8, marginTop: 4,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2>Maya Voice &amp; Responses</h2>
      {err && <div style={{ color: "#dc2626" }}>{err}</div>}

      <section>
        <h3>Voice</h3>
        <label style={{ fontSize: 13 }}>
          Production voice (OpenAI TTS)
          <select value={cfg["maya.voice"] ?? "nova"} onChange={(e) => set("maya.voice", e.target.value)} style={inputStyle}>
            {VOICES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <label style={{ fontSize: 13, flex: 1 }}>
            Rate ({cfg["maya.voice_rate"] ?? "1"})
            <input type="range" min="0.5" max="2" step="0.1" value={cfg["maya.voice_rate"] ?? "1"} onChange={(e) => set("maya.voice_rate", e.target.value)} style={{ width: "100%" }} />
          </label>
          <label style={{ fontSize: 13, flex: 1 }}>
            Pitch ({cfg["maya.voice_pitch"] ?? "1"})
            <input type="range" min="0.5" max="2" step="0.1" value={cfg["maya.voice_pitch"] ?? "1"} onChange={(e) => set("maya.voice_pitch", e.target.value)} style={{ width: "100%" }} />
          </label>
        </div>
        <p style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
          Rate/pitch apply to the in-browser preview; the production voice is the OpenAI selection above.
        </p>
      </section>

      <section>
        <h3>Persona &amp; tone</h3>
        <label style={{ fontSize: 13 }}>
          Greeting
          <input value={cfg["maya.greeting"] ?? ""} onChange={(e) => set("maya.greeting", e.target.value)} placeholder="Hi, I'm Maya from Boreal…" style={inputStyle} />
        </label>
        <label style={{ fontSize: 13, display: "block", marginTop: 8 }}>
          Tone
          <input value={cfg["maya.tone"] ?? ""} onChange={(e) => set("maya.tone", e.target.value)} placeholder="warm, concise, professional" style={inputStyle} />
        </label>
        <label style={{ fontSize: 13, display: "block", marginTop: 8 }}>
          Persona / instructions
          <textarea value={cfg["maya.persona"] ?? ""} onChange={(e) => set("maya.persona", e.target.value)} rows={4} placeholder="How Maya should present herself and what to emphasize for clients and staff…" style={{ ...inputStyle, fontFamily: "inherit" }} />
        </label>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <Button onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          {saved && <span style={{ color: "#0a5d1c", fontSize: 13 }}>Saved.</span>}
        </div>
      </section>

      <section>
        <h3>Test Maya</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={testText} onChange={(e) => setTestText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void runTest(); }} placeholder="Ask Maya something a client or staff member might ask…" style={{ flex: 1, ...inputStyle, marginTop: 0 }} />
          <Button onClick={() => void runTest()} disabled={testing || !testText.trim()}>{testing ? "…" : "Ask"}</Button>
        </div>
        {reply && (
          <div style={{ marginTop: 10, border: "1px solid var(--ui-border)", borderRadius: 6, padding: 10, fontSize: 14, lineHeight: 1.5 }}>
            {reply}
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <Button onClick={() => speakBrowser(reply)}>▶ Preview voice</Button>
              <Button onClick={() => void playNova(reply)}>🔊 Hear in {cfg["maya.voice"] ?? "nova"}</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
