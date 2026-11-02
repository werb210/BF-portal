// BF_PORTAL_v865_KS_MARKETING - Keystone email templates: the content fields of a fixed Keystone-branded layout
// (never Boreal's), a live preview rendered by KS-Ops exactly as it will be sent (footer and unsubscribe link
// included), and a test send. Also exports the editor so campaigns can edit their own copy.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, confirmAction, ErrorBox, Field, input, Loading, Section } from "../ksUi";
import { SenderWarnings } from "./KsMarketing";
import { EMPTY_FIELDS, mktApi, type Template, type TemplateFields } from "./ksMarketingApi";

export const MERGE_HINT = "Merge tags: {{first_name}}, {{name}}, {{company}}, {{email}}. Leave a blank line between paragraphs.";

/** Subject + content fields, with the preview and a test send. */
export function EmailEditor({
  subject,
  fields,
  onSubject,
  onFields,
}: {
  subject: string;
  fields: TemplateFields;
  onSubject: (s: string) => void;
  onFields: (f: TemplateFields) => void;
}) {
  const [html, setHtml] = useState<string>("");
  const [to, setTo] = useState("");
  const preview = useMutation({ mutationFn: () => mktApi.preview(subject, fields), onSuccess: (r) => setHtml(r.html) });
  const test = useMutation({ mutationFn: () => mktApi.testSend(subject, fields, to.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)) });
  const set = (k: keyof TemplateFields) => (e: { target: { value: string } }) => onFields({ ...fields, [k]: e.target.value });

  // Refresh the preview a moment after typing stops.
  useEffect(() => {
    const t = setTimeout(() => preview.mutate(), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, JSON.stringify(fields)]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }} data-testid="ks-mkt-editor">
      <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
        <Field name="Subject">
          <input style={input} value={subject} onChange={(e) => onSubject(e.target.value)} aria-label="Subject" maxLength={200} />
        </Field>
        <Field name="Preview text (shown after the subject in the inbox)">
          <input style={input} value={fields.preheader} onChange={set("preheader")} maxLength={200} />
        </Field>
        <Field name="Headline">
          <input style={input} value={fields.headline} onChange={set("headline")} aria-label="Headline" maxLength={200} />
        </Field>
        <Field name="Body">
          <textarea style={{ ...input, minHeight: 160 }} value={fields.body} onChange={set("body")} aria-label="Body" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field name="Button text">
            <input style={input} value={fields.cta_label} onChange={set("cta_label")} maxLength={60} />
          </Field>
          <Field name="Button link (https://)">
            <input style={input} value={fields.cta_url} onChange={set("cta_url")} placeholder="https://" />
          </Field>
        </div>
        <Field name="After the button">
          <textarea style={{ ...input, minHeight: 80 }} value={fields.body2} onChange={set("body2")} />
        </Field>
        <Field name="Sign-off">
          <textarea style={{ ...input, minHeight: 50 }} value={fields.signature} onChange={set("signature")} placeholder={"Thanks,\nThe Keystone team"} />
        </Field>
        <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: 0 }}>
          {MERGE_HINT} The Keystone header, the sender and mailing address footer and the unsubscribe link are added to every email and cannot be removed.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field name="Send a test to (up to 5)">
            <input style={{ ...input, width: 260 }} value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@boreal.financial" aria-label="Test addresses" />
          </Field>
          <Button onClick={() => test.mutate()} disabled={test.isPending || !to.trim() || !subject.trim()}>Send test</Button>
        </div>
        <ErrorBox error={test.error} />
        {test.data ? (
          <p role="status" style={{ fontSize: 14, margin: 0 }}>
            {test.data.sent.length ? `Test sent to ${test.data.sent.join(", ")}.` : ""}
            {test.data.failed.length ? ` Failed: ${test.data.failed.map((f) => `${f.email} (${f.error})`).join("; ")}` : ""}
          </p>
        ) : null}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ui-text-muted)", marginBottom: 4 }}>Preview (sample prospect: Alex Sample, Sample Brokerage)</div>
        <ErrorBox error={preview.error} />
        <iframe
          title="Email preview"
          sandbox=""
          srcDoc={html}
          style={{ width: "100%", height: 720, border: "1px solid var(--ui-border)", borderRadius: 8, background: "#ffffff" }}
        />
      </div>
    </div>
  );
}

export const fieldsOf = (t?: Partial<TemplateFields> | null): TemplateFields => ({ ...EMPTY_FIELDS, ...(t ?? {}) });

export default function KsMktTemplates() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["ks", "mkt", "templates"], queryFn: () => mktApi.templates() });
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [fields, setFields] = useState<TemplateFields>(EMPTY_FIELDS);
  const open = (t: Template | null) => {
    setEditing(t);
    setName(t?.name ?? "");
    setSubject(t?.subject ?? "");
    setFields(fieldsOf(t?.fields));
  };
  const done = () => void qc.invalidateQueries({ queryKey: ["ks", "mkt", "templates"] });
  const save = useMutation({
    mutationFn: (asNew: boolean) =>
      editing && !asNew ? mktApi.updateTemplate(editing.id, { name, subject, fields }) : mktApi.createTemplate({ name, subject, fields }),
    onSuccess: (r) => {
      setEditing(r.template);
      done();
    },
  });
  const archive = useMutation({ mutationFn: (id: string) => mktApi.archiveTemplate(id), onSuccess: () => { open(null); done(); } });
  const templates = list.data?.templates ?? [];
  return (
    <>
      <SenderWarnings compact />
      <Section title="Templates" actions={<Button kind="primary" onClick={() => open(null)}>New template</Button>}>
        {list.isLoading ? <Loading what="templates" /> : null}
        <ErrorBox error={list.error} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {templates.map((t) => (
            <Button key={t.id} kind={editing?.id === t.id ? "primary" : "secondary"} onClick={() => open(t)}>{t.name}</Button>
          ))}
          {!list.isLoading && templates.length === 0 ? <p style={{ margin: 0, color: "var(--ui-text-muted)", fontSize: 14 }}>No templates yet.</p> : null}
        </div>
      </Section>
      <Section title={editing ? `Edit: ${editing.name}` : "New template"}>
        <ErrorBox error={save.error ?? archive.error} />
        <Field name="Template name">
          <input style={{ ...input, maxWidth: 420 }} value={name} onChange={(e) => setName(e.target.value)} aria-label="Template name" />
        </Field>
        <div style={{ height: 12 }} />
        <EmailEditor subject={subject} fields={fields} onSubject={setSubject} onFields={setFields} />
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <Button kind="primary" onClick={() => save.mutate(false)} disabled={save.isPending || !name.trim() || !subject.trim()}>
            {editing ? "Save" : "Create template"}
          </Button>
          {editing ? <Button onClick={() => save.mutate(true)} disabled={save.isPending}>Save as a new template</Button> : null}
          {editing ? (
            <Button kind="danger" onClick={() => confirmAction(`Archive "${editing.name}"? It leaves this list; sequences already using it keep sending it.`) && archive.mutate(editing.id)}>
              Archive
            </Button>
          ) : null}
        </div>
        {save.isSuccess ? <p role="status" style={{ fontSize: 14 }}>Saved.</p> : null}
      </Section>
    </>
  );
}
