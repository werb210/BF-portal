// BF_PORTAL_v786_WORKFLOW_BUILDER - "Choose an action" search + insert, the branch editor,
// detail forms and the trigger editor.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BranchEditor, NodeDetails, type FormContext } from "../DetailForms";
import { InsertPanel, TriggerPanel } from "../SidePanel";
import type { BranchNode, WorkflowNode } from "../types";
import { normalizeCatalog } from "../workflowApi";

const catalog = normalizeCatalog({
  fields: { score: { label: "Score", type: "number" }, lifecycle_stage: { label: "Lifecycle Stage", type: "select", options: ["lead", "customer"] } },
  operators: ["eq", "gte", "is_set"],
  triggers: [
    { type: "contact.created", label: "Contact is created", group: "Contacts", filterFields: ["lifecycle_stage"] },
    { type: "application.stage_changed", label: "Application stage changes", group: "Applications", filterFields: [] },
    { type: "email.opened", label: "Marketing email opened", group: "Engagement", filterFields: [] },
  ],
  templates: { email: [{ id: "t1", name: "Welcome email", subject: "Welcome aboard", body: "<p>Hi {{first_name}}</p><script>alert(1)</script>" }], sms: [{ id: "s1", name: "Missed call", body: "Sorry we missed you" }] },
});
const ctx: FormContext = { catalog, users: [{ id: "u1", name: "Andrew P" }], lists: [], workflows: [], nodes: {}, numbers: {} };

describe("InsertPanel", () => {
  it("lists every group and filters by search", () => {
    render(<InsertPanel ctx={ctx} onInsert={vi.fn()} onClose={vi.fn()} />);
    const panel = screen.getByTestId("side-panel");
    expect(within(panel).getByText("Choose an action")).toBeInTheDocument();
    for (const g of ["Delay", "Workflow", "Internal communication", "External communication", "Assignment", "Create", "Edit record", "List management"]) {
      expect(within(panel).getByRole("heading", { name: g })).toBeInTheDocument();
    }
    fireEvent.change(screen.getByLabelText("Search actions"), { target: { value: "tag" } });
    expect(screen.getByRole("button", { name: "Add tag" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove tag" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send email" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Search actions"), { target: { value: "zzz" } });
    expect(screen.getByText('No actions match "zzz".')).toBeInTheDocument();
  });

  it("opens the Details form and inserts on Save", () => {
    const onInsert = vi.fn();
    render(<InsertPanel ctx={ctx} onInsert={onInsert} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Send email" }));
    fireEvent.change(screen.getByLabelText("Email template"), { target: { value: "t1" } });
    const preview = screen.getByTestId("email-preview");
    expect(preview).toHaveTextContent("Subject: Welcome aboard");
    expect(preview.innerHTML).not.toContain("<script");
    expect(screen.getByTestId("token-help")).toHaveTextContent("{{first_name}}");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onInsert).toHaveBeenCalledWith({ kind: "action", action: "send_email", params: { templateId: "t1" }, next: null });
  });

  it("shows what is still needed and offers paste", () => {
    const onPaste = vi.fn();
    render(<InsertPanel ctx={ctx} onInsert={vi.fn()} onClose={vi.fn()} onPaste={onPaste} pasteLabel="Add note" />);
    fireEvent.click(screen.getByRole("button", { name: "Paste copied action: Add note" }));
    expect(onPaste).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Trigger webhook" }));
    expect(screen.getByTestId("missing-params")).toHaveTextContent("Enter an https:// address");
    fireEvent.change(screen.getByLabelText("Webhook address"), { target: { value: "http://x.example" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Use an https:// address.");
  });
});

describe("BranchEditor", () => {
  it("adds, renames, reorders and edits branch conditions", () => {
    let node: BranchNode = { kind: "branch", branches: [{ id: "a", label: "Branch 1", logic: "all", conditions: [{ field: "", op: "eq", value: "" }], next: "n1" }], noneNext: null };
    const onChange = vi.fn((n: BranchNode) => { node = n; });
    const { rerender } = render(<BranchEditor node={node} onChange={onChange} catalog={catalog} />);
    const again = () => rerender(<BranchEditor node={node} onChange={onChange} catalog={catalog} />);
    fireEvent.change(screen.getByLabelText("Branch 1 name"), { target: { value: ">= 70" } }); again();
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "score" } }); again();
    fireEvent.change(screen.getByLabelText("Operator"), { target: { value: "gte" } }); again();
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "70" } }); again();
    expect(node.branches[0]).toMatchObject({ label: ">= 70", next: "n1", conditions: [{ field: "score", op: "gte", value: "70" }] });
    fireEvent.click(screen.getByText("+ Add branch")); again();
    expect(node.branches).toHaveLength(2);
    fireEvent.change(screen.getAllByLabelText("Match")[0]!, { target: { value: "any" } }); again();
    expect(node.branches[0]!.logic).toBe("any");
    fireEvent.click(screen.getByLabelText("Move branch 2 up")); again();
    expect(node.branches.map((b) => b.label)).toEqual(["Branch 2", ">= 70"]);
    expect(screen.getAllByTestId("branch-row")).toHaveLength(2);
  });

  it("value branch makes one case per option", () => {
    let node: WorkflowNode = { kind: "value_branch", field: "", cases: [], noneNext: null };
    const { rerender } = render(<NodeDetails node={node} onChange={(n) => { node = n; }} ctx={ctx} />);
    fireEvent.change(screen.getByLabelText("Branch on property"), { target: { value: "lifecycle_stage" } });
    rerender(<NodeDetails node={node} onChange={(n) => { node = n; }} ctx={ctx} />);
    expect(node.kind === "value_branch" && node.cases.map((c) => c.value)).toEqual(["lead", "customer"]);
  });

  it("SMS form offers a template or custom text and the message type", () => {
    let node: WorkflowNode = { kind: "action", action: "send_sms", params: { templateId: "", body: "", kind: "transactional" }, next: null };
    const { rerender } = render(<NodeDetails node={node} onChange={(n) => { node = n; }} ctx={ctx} />);
    fireEvent.change(screen.getByLabelText("Text message"), { target: { value: "Hi {{first_name}}" } });
    rerender(<NodeDetails node={node} onChange={(n) => { node = n; }} ctx={ctx} />);
    fireEvent.change(screen.getByLabelText("Message type"), { target: { value: "marketing" } });
    expect(node).toMatchObject({ params: { body: "Hi {{first_name}}", kind: "marketing" } });
  });
});

describe("TriggerPanel", () => {
  it("groups triggers, adds filters and the re-enrollment choice", () => {
    const onSave = vi.fn();
    render(<TriggerPanel catalog={catalog} triggers={[]} reenroll="never" onSave={onSave} onClose={vi.fn()} />);
    const picker = screen.getByTestId("trigger-picker");
    expect(within(picker).getByRole("heading", { name: "Contacts" })).toBeInTheDocument();
    expect(within(picker).getByRole("heading", { name: "Applications" })).toBeInTheDocument();
    expect(within(picker).getByRole("heading", { name: "Engagement" })).toBeInTheDocument();
    fireEvent.click(within(picker).getByRole("button", { name: "Contact is created" }));
    fireEvent.click(screen.getByText("+ Add condition"));
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "lifecycle_stage" } });
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "lead" } });
    fireEvent.change(screen.getByLabelText("Re-enrollment"), { target: { value: "after_complete" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith([{ type: "contact.created", filters: [{ field: "lifecycle_stage", op: "eq", value: "lead" }], filterLogic: "all" }], "after_complete");
  });
});
