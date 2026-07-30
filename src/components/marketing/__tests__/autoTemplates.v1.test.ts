import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { serializeNodes, type SequenceNode } from "../SequenceCanvas";

describe("SMS or email channel templates v1", () => {
  it("serializes both branch-specific template ids without the legacy shared id", () => {
    const step: SequenceNode = {
      id: "auto-1",
      kind: "auto",
      templateId: "legacy-template",
      smsTemplateId: "sms-template",
      emailTemplateId: "email-template",
    };

    expect(serializeNodes([step], "bf")[0]).toEqual(expect.objectContaining({
      channel: "auto",
      template_id: null,
      sms_template_id: "sms-template",
      email_template_id: "email-template",
    }));
  });

  it("provides separate channel-filtered pickers and no auto message textarea", () => {
    const source = readFileSync("src/components/marketing/SequenceCanvas.tsx", "utf8");

    expect(source).toContain('data-testid="auto-sms-template"');
    expect(source).toContain('data-testid="auto-email-template"');
    expect(source).toContain('t.channel === "sms"');
    expect(source).toContain('t.channel === "email"');
    expect(source).toContain('selected.kind === "auto" ? <>');
  });
});
