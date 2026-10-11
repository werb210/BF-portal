// BF_PORTAL_v787_BUILDER_FIXES - graph helpers and api normalizers match BF-Server: node ids,
// copied links, trigger params, weekday numbers, no weeks, quiet-hours defaults, the renamed
// actions, v786 conversion on load, filterFields, byNode, history path and error codes.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ACTIONS, searchActions } from "../actions";
import { START, cloneAfter, copyNodes, detachedCopy, insertAt, missingParams, summarize, toServerGraph, triggerIssues } from "../graph";
import { DEFAULT_SETTINGS, emptyWorkflow, type Graph, type WorkflowNode } from "../types";
import { errorIssues, errorText, normalizeCatalog, normalizeHistory, normalizePerformance, normalizeWorkflow, toBody } from "../workflowApi";

const make = (key: string): WorkflowNode => ACTIONS.find((a) => a.key === key)!.make();
const params = (n: WorkflowNode) => (n.kind === "action" || n.kind === "delay" ? n.params : {});

describe("node ids", () => {
  it("graph.ts carries the v787 marker", () => {
    expect(readFileSync("src/pages/automations/workflow/graph.ts", "utf8")).toContain("BF_PORTAL_v787_BUILDER_FIXES");
  });

  it("insertAt stores the node with id equal to its key", () => {
    const g = insertAt({ triggers: [], startNodeId: null, nodes: {} }, START, "a1", make("add_note"));
    expect(g.nodes.a1!.id).toBe("a1");
  });

  it("clone and copy give a new id that matches the key", () => {
    let g = insertAt({ triggers: [], startNodeId: null, nodes: {} }, START, "a1", { kind: "action", action: "add_note", params: { body: "x" }, next: null });
    const out = cloneAfter(g, "a1");
    g = out.graph;
    expect(out.id).not.toBe("a1");
    expect(g.nodes[out.id]!.id).toBe(out.id);
    expect(g.nodes.a1!.kind === "action" && g.nodes.a1!.next).toBe(out.id);
    const copy = detachedCopy(g.nodes.a1!);
    expect(copy.id).toBeTruthy();
    expect(copy.id).not.toBe("a1");
    expect(copy.kind === "action" && copy.next).toBeNull();
  });

  it("copyNodes rewrites every link inside the copy to the new ids", () => {
    const nodes: Graph["nodes"] = {
      b: { id: "b", kind: "branch", branches: [{ id: "x", label: "X", logic: "all", conditions: [{ field: "f", op: "eq", value: "1" }], next: "c" }], noneNext: "d" },
      c: { id: "c", kind: "delay", mode: "until_event", params: { event: "email.opened", timeoutAmount: 1, timeoutUnit: "days" }, next: "v", timeoutNext: "g" },
      d: { id: "d", kind: "action", action: "add_note", params: { body: "n" }, next: "outside" },
      v: { id: "v", kind: "value_branch", field: "stage", cases: [{ id: "k", label: "A", value: "A", next: "d" }], noneNext: null },
      g: { id: "g", kind: "goto", target: "b" },
      h: { id: "h", kind: "goto", target: "outside" },
    };
    const { nodes: copied, idMap } = copyNodes(nodes, ["b", "c", "d", "v", "g", "h"]);
    for (const [key, n] of Object.entries(copied)) expect(n.id).toBe(key);
    const B = copied[idMap.b!]!, C = copied[idMap.c!]!, D = copied[idMap.d!]!, V = copied[idMap.v!]!, G = copied[idMap.g!]!, H = copied[idMap.h!]!;
    expect(B.kind === "branch" && [B.branches[0]!.next, B.noneNext, B.branches[0]!.id !== "x"]).toEqual([idMap.c, idMap.d, true]);
    expect(C.kind === "delay" && [C.next, C.timeoutNext]).toEqual([idMap.v, idMap.g]);
    expect(D.kind === "action" && D.next).toBeNull();
    expect(V.kind === "value_branch" && V.cases[0]!.next).toBe(idMap.d);
    expect(G.kind === "goto" && G.target).toBe(idMap.b);
    expect(H.kind === "goto" && H.target).toBe("outside");
  });
});

describe("timing", () => {
  it("delay units are minutes, hours, days; old weeks load as days x 7", () => {
    const g = toServerGraph({ triggers: [], startNodeId: "a", nodes: {
      a: { kind: "delay", mode: "duration", params: { amount: 2, unit: "weeks" }, next: "b" },
      b: { kind: "delay", mode: "until_event", params: { event: "email.opened", timeoutAmount: 1, timeoutUnit: "weeks" }, next: null, timeoutNext: null },
    } });
    expect(params(g.nodes.a!)).toEqual({ amount: 14, unit: "days" });
    expect(params(g.nodes.b!)).toMatchObject({ timeoutAmount: 7, timeoutUnit: "days" });
    expect(JSON.stringify(ACTIONS.map((a) => a.make()))).not.toContain("weeks");
  });

  it("weekdays are numbers 0-6 with Sunday = 0; old strings convert", () => {
    const g = toServerGraph({ triggers: [], startNodeId: "a", nodes: { a: { kind: "delay", mode: "until_time", params: { time: "09:00", weekdays: ["mon", "sun", "sat"] }, next: null } } });
    expect(params(g.nodes.a!).weekdays).toEqual([1, 0, 6]);
    expect(summarize({ kind: "delay", mode: "until_time", params: { time: "09:00", weekdays: [0, 1, 5] }, next: null })).toBe("Delay until 09:00 on Mon, Fri, Sun");
    expect(missingParams({ kind: "delay", mode: "until_time", params: { time: "9:00", weekdays: [] }, next: null })).toEqual(["Choose a time of day"]);
  });

  it("quiet hours default to sending 09:00-20:00 Edmonton, enabled", () => {
    expect(DEFAULT_SETTINGS.quietHours).toEqual({ enabled: true, start: "09:00", end: "20:00", tz: "America/Edmonton" });
    expect(emptyWorkflow().settings.quietHours.start).toBe("09:00");
    expect(normalizeWorkflow({ settings: { quietHours: { enabled: true, start: "08:00", end: "18:00", tz: "America/Edmonton" } } }).settings.quietHours).toMatchObject({ start: "08:00", end: "18:00" });
  });
});

describe("actions in the server form", () => {
  it("three internal menu entries make notify_staff with a channel, to and message", () => {
    expect(make("notify_staff_email")).toEqual({ kind: "action", action: "notify_staff", params: { channel: "email", to: "owner", message: "" }, next: null });
    expect(params(make("notify_staff_sms")).channel).toBe("sms");
    expect(params(make("notify_staff_in_app")).channel).toBe("in_app");
    expect(searchActions("").map((a) => a.label)).toEqual(expect.arrayContaining(["Send internal email notification", "Send internal SMS", "Send in-app notification"]));
    expect(searchActions("").some((a) => a.key === "notify_staff_team")).toBe(false);
    expect(missingParams(make("notify_staff_email"))).toEqual(["Write the message"]);
    expect(summarize({ kind: "action", action: "notify_staff", params: { channel: "sms", to: "u1", message: "Call them" }, next: null }, { users: [{ id: "u1", name: "Andrew P" }] })).toBe("Text Andrew P: \"Call them\"");
  });

  it("set_contact_field, set_application_stage, send_sms kind, create_task and webhook params", () => {
    expect(make("set_contact_field")).toMatchObject({ action: "set_contact_field", params: { field: "", value: "" } });
    expect(make("set_application_stage")).toMatchObject({ action: "set_application_stage", params: { stage: "" } });
    expect(params(make("send_sms"))).toEqual({ templateId: "", body: "", kind: "transactional" });
    expect(params(make("create_task"))).toEqual({ title: "", type: "TODO", priority: "MEDIUM", dueInHours: 24, assignee: "owner" });
    expect(params(make("webhook"))).toMatchObject({ url: "", method: "POST", includeFields: expect.any(Array) });
    expect(missingParams({ kind: "action", action: "webhook", params: { url: "http://x.example", method: "POST", includeFields: [] }, next: null })).toEqual(["Enter an https:// address"]);
    expect(missingParams(make("set_application_stage"))).toEqual(["Choose a stage"]);
  });

  it("rotate_owner with nobody chosen is valid and means all active staff", () => {
    const n = make("rotate_owner");
    expect(missingParams(n)).toEqual([]);
    expect(summarize(n)).toBe("Rotate owner between all active staff");
  });
});

describe("loading v786 workflows", () => {
  it("converts old names and params to the server form, ids matching keys", () => {
    const w = normalizeWorkflow({
      id: "w1", name: "Old", silo: "BI",
      graph: {
        triggers: [{ type: "date.relative", filters: [], filterLogic: "all", params: { field: "created_at", offsetDays: -2, time: "10:00" } }],
        startNodeId: "a",
        nodes: {
          a: { kind: "action", action: "internal_email", params: { to: "user", userId: "u1", subject: "Hot lead", body: "Call now" }, next: "b" },
          b: { kind: "action", action: "internal_sms", params: { to: "owner", userId: "", body: "Hi" }, next: "c" },
          c: { kind: "action", action: "in_app_notification", params: { to: "owner", body: "Ping" }, next: "d" },
          d: { kind: "action", action: "set_property", params: { field: "lead_status", value: "hot" }, next: "e" },
          e: { kind: "action", action: "set_stage", params: { stage: "Offer" }, next: "f" },
          f: { kind: "action", action: "send_sms", params: { body: "x", purpose: "marketing" }, next: "g" },
          g: { kind: "action", action: "create_task", params: { title: "T", taskType: "CALL", priority: "HIGH", dueHours: 4, assignTo: "user", userId: "u2" }, next: "h" },
          h: { kind: "action", action: "webhook", params: { url: "https://x.example", fields: [{ key: "email", value: "{{email}}" }, { key: "custom", value: "1" }] }, next: null },
        },
      },
    });
    const n = w.graph.nodes;
    for (const [key, node] of Object.entries(n)) expect(node.id).toBe(key);
    expect(n.a).toMatchObject({ action: "notify_staff", params: { channel: "email", to: "u1", message: "Hot lead\nCall now" } });
    expect(n.b).toMatchObject({ action: "notify_staff", params: { channel: "sms", to: "owner", message: "Hi" } });
    expect(n.c).toMatchObject({ action: "notify_staff", params: { channel: "in_app", to: "owner", message: "Ping" } });
    expect(n.d).toMatchObject({ action: "set_contact_field", params: { field: "lead_status", value: "hot" } });
    expect(n.e).toMatchObject({ action: "set_application_stage", params: { stage: "Offer" } });
    expect(params(n.f!)).toEqual({ body: "x", kind: "marketing" });
    expect(params(n.g!)).toEqual({ title: "T", type: "CALL", priority: "HIGH", dueInHours: 4, assignee: "u2" });
    expect(params(n.h!)).toEqual({ url: "https://x.example", method: "POST", includeFields: ["email"] });
    expect(w.silo).toBe("BI");
    expect(w.graph.triggers[0]!.params).toEqual({ field: "created_at", offsetDays: -2, time: "10:00" });
    const body = toBody(w);
    expect(body.graph.triggers[0]!.params).toEqual({ field: "created_at", offsetDays: -2, time: "10:00" });
    expect(JSON.stringify(body)).not.toMatch(/internal_email|set_property|"set_stage"|purpose|taskType|dueHours|assignTo/);
  });

  it("trigger params are checked like the server", () => {
    expect(triggerIssues([{ type: "date.relative", filters: [], filterLogic: "all", params: { offsetDays: 0 } }])).toEqual([{ nodeId: "trigger:0", message: "Choose the date field" }]);
    expect(triggerIssues([{ type: "no_reply", filters: [], filterLogic: "all", params: { days: 3 } }])).toEqual([]);
  });
});

describe("api shapes", () => {
  it("catalog triggers use type and filterFields; actions keep their params", () => {
    const c = normalizeCatalog({
      triggers: [{ type: "contact.created", label: "A contact is created", group: "Contacts", filterFields: ["source", "contact_tag"] }],
      actions: [{ action: "set_contact_field", label: "Set a contact field", group: "Contact", params: [{ key: "field", label: "Field", type: "select", options: ["first_name", "lead_status"], required: true }] }],
      fields: [{ key: "source", label: "Source", type: "text", options: ["website_form"] }],
      templates: { email: [{ id: "t1", name: "Welcome" }], sms: [] },
    });
    expect(c.triggers).toEqual([{ type: "contact.created", label: "A contact is created", group: "Contacts", filterFields: ["source", "contact_tag"] }]);
    expect(c.actions[0]!.params[0]!.options).toEqual(["first_name", "lead_status"]);
    expect(c.fields[0]!.options).toEqual([{ value: "website_form", label: "website_form" }]);
    expect(c.templates.email[0]).toEqual({ id: "t1", name: "Welcome", subject: undefined, body: undefined });
  });

  it("performance byNode and history label / path", () => {
    expect(normalizePerformance({ enrolled: 3, byNode: { a: { entered: 3, failed: 1 } } }).byNode).toEqual({ a: { entered: 3, failed: 1 } });
    const [e] = normalizeHistory([{ id: "e1", status: "active", contact_id: "c1", current_node_id: "b", label: "Jane Doe", created_at: "2026-10-01T00:00:00Z", path: [{ nodeId: "a", kind: "action", at: "2026-10-01T00:00:01Z", result: "task t1" }] }]);
    expect(e).toMatchObject({ label: "Jane Doe", currentNodeId: "b", path: [{ nodeId: "a", kind: "action", result: "task t1" }] });
  });

  it("error codes read as plain English; the role text only for 403", () => {
    const e422 = { status: 422, message: "API_ERROR", details: { error: { code: "fix_issues_before_enabling" }, issues: [{ nodeId: "trigger:0", message: "date trigger needs a date field" }] } };
    expect(errorText(e422, "Could not save.", "Only admins and marketing can change workflows.")).toBe("Fix the issues before turning this workflow on: date trigger needs a date field");
    expect(errorIssues(e422)).toEqual([{ nodeId: "trigger:0", message: "date trigger needs a date field" }]);
    expect(errorText({ status: 403, message: "API_ERROR", details: { error: { code: "forbidden" } } }, "Could not save.", "Only admins and marketing can change workflows.")).toBe("Only admins and marketing can change workflows.");
    expect(errorText({ status: 500, message: "API_ERROR" }, "Could not save.", "Only admins and marketing can change workflows.")).toBe("Could not save.");
  });
});
