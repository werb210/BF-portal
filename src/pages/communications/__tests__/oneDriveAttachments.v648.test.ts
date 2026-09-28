// BF_PORTAL_ONEDRIVE_ATTACHMENTS_v648
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REQUIRED_O365_SCOPES, withRequiredO365Scopes } from "@/auth/o365Scopes";

const page = readFileSync("src/pages/communications/CommunicationsPage.tsx", "utf8");
const compose = readFileSync("src/components/communications/O365ComposeModal.tsx", "utf8");

describe("v648 attachments to OneDrive", () => {
  it("sign-in always asks for OneDrive access", () => {
    expect(REQUIRED_O365_SCOPES).toContain("Files.ReadWrite");
    expect(withRequiredO365Scopes("User.Read,Mail.Send")).toContain("Files.ReadWrite");
  });
  it("in the app the button saves to OneDrive; on the website it still downloads", () => {
    expect(page).toContain("onClick={() => void (inApp ? saveAllToOneDrive() : downloadAllAttachments())}");
    expect(page).toContain('(inApp ? "Save all to OneDrive" : "Download all")');
    expect(page).toContain("/attachments/save-to-onedrive");
  });
  it("offers Reconnect when OneDrive permission is missing", () => {
    expect(page).toContain("onedrive_permission_needed");
    expect(page).toContain("Reconnect Microsoft 365");
  });
});

describe("v648 Cc and Bcc suggest addresses like To", () => {
  it("all three use the address autocomplete", () => {
    expect(compose).toContain('<RecipientAutocomplete value={composeCc} onChange={setComposeCc} placeholder="Cc (comma-separated)"');
    expect(compose).toContain('<RecipientAutocomplete value={composeBcc} onChange={setComposeBcc} placeholder="Bcc (comma-separated)"');
    expect(compose).not.toContain('<input type="text" placeholder="Cc (comma-separated)"');
  });
});
