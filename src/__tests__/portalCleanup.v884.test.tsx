// BF_PORTAL_v884_PORTAL_CLEANUP - behaviour tests for the 2026-11-02 portal review fixes: Quotes (option count, unsaved
// work, send reason), Funding conditions (template refresh, no-offer reason, field error), credit summary markdown,
// starter call scripts, server setting names kept off staff screens, plain words for codes, number formats, time zone.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn(), role: "Staff" }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put, patch: h.patch, delete: h.del }, rawApiFetch: vi.fn() }));
vi.mock("@/utils/api", () => ({ apiBlob: vi.fn(async () => new Blob(["%PDF-"])) }));
vi.mock("@/dealTools/ui", async (orig) => ({ ...(await orig<any>()), useIsAdmin: () => h.role === "Admin", useRole: () => h.role }));

import QuotesTab from "@/quotes/QuotesTab";
import type { Quote } from "@/quotes/quotesApi";
import FundingConditionsPanel from "@/brokerTools/FundingConditionsPanel";
import CallScriptsSettings from "@/callScripts/CallScriptsSettings";
import { SetupText, plainSetupText, settingNamesIn, withoutSettingNames } from "@/components/SetupNotice";
import { renderInlineMarkdown } from "@/utils/inlineMarkdown";
import { formatDateTimeShort, formatMoneyValue, groupDigits, humanizeCode, humanizeCodesInText, isInternalCode, stripIpPort, zoneWords } from "@/utils/labels";

beforeEach(() => {
  h.get.mockReset(); h.post.mockReset(); h.put.mockReset(); h.patch.mockReset(); h.del.mockReset(); h.role = "Staff";
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

// ------------------------------------------------------------------------------------------------ 1. quotes
const blank = (over: Partial<Quote> = {}): Quote => ({ id: "q1", application_id: "app-1", quote_number: "Q-261102-04AD9", status: "draft", title: "Your financing options", message: null, currency: "CAD", tax_province: "ON", expires_on: "2026-11-16", pdf_document_id: null, accepted_option_id: null, accepted_name: null, decline_reason: null, view_count: 0, created_at: "2026-11-02T10:00:00Z", sent_at: null, first_viewed_at: null, last_viewed_at: null, accepted_at: null, declined_at: null, withdrawn_at: null, options: [], ...over });

describe("Quotes tab (v884)", () => {
  it("counts an option as soon as it is added, keeps it on Edit, and only allows Send with an option", async () => {
    h.get.mockResolvedValue({ ok: true, quotes: [blank()], offers: [], provinces: [], default_tax_province: "ON" });
    h.post.mockResolvedValue({ ok: true, quote: blank() });
    render(<QuotesTab applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Start a blank quote" }));
    expect(await screen.findByTestId("quote-editor")).toBeInTheDocument();
    // While editing, "Start a blank quote" is out of the way.
    expect(screen.queryByRole("button", { name: "Start a blank quote" })).toBeNull();
    // No options yet: Send is off and says why.
    expect(screen.getByRole("button", { name: "Send to client" })).toBeDisabled();
    expect(screen.getByTestId("quote-send-reason")).toHaveTextContent("Add at least one option");

    fireEvent.click(screen.getByRole("button", { name: "Add an option" }));
    expect(screen.getByRole("button", { name: "Send to client" })).toBeEnabled();
    expect(screen.queryByTestId("quote-send-reason")).toBeNull();
    const row = await screen.findByTestId("quote-q1");
    expect(row).toHaveTextContent("1 option(s) (not saved yet)");
    expect(screen.getByTestId("quote-unsaved")).toBeInTheDocument();

    // Edit on the quote already open keeps the unsaved option.
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    expect(screen.getByTestId("quote-option-0")).toBeInTheDocument();
  });

  it("warns before closing a quote with unsaved changes", async () => {
    h.get.mockResolvedValue({ ok: true, quotes: [blank()], offers: [], provinces: [] });
    h.post.mockResolvedValue({ ok: true, quote: blank() });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<QuotesTab applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Start a blank quote" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add an option" }));
    fireEvent.click(screen.getByRole("button", { name: "Close the editor" }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByTestId("quote-editor")).toBeInTheDocument();
  });
});

// ------------------------------------------------------------------------------------------------ 2. funding conditions
const condition = { id: "c1", title: "Signed insurance certificate", description: null, owner: "staff", assigned_user_id: null, due_date: null, status: "open", source: "template", requires_document: false, document_id: null, document_url: null, note: null, waived_reason: null, client_submitted_at: null, overdue: false };

describe("Funding conditions (v884)", () => {
  const routes = (offers: unknown[]) => h.get.mockImplementation(async (url: string) => (
    url.includes("/conditions") ? { conditions: [] } : url.includes("/people") ? { people: [] } : { ok: true, quotes: [], offers, provinces: [] }));

  it("shows the conditions the templates added straight away", async () => {
    routes([{ id: "o1" }]);
    h.post.mockResolvedValue({ ok: true, conditions: [condition], added: 1 });
    render(<FundingConditionsPanel applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Add from templates" }));
    expect(await screen.findByTestId("condition-c1")).toHaveTextContent("Signed insurance certificate");
    expect(screen.getByRole("status")).toHaveTextContent("1 template condition added.");
  });

  it("says so when no template condition was added", async () => {
    routes([{ id: "o1" }]);
    h.post.mockResolvedValue({ ok: true, conditions: [], added: 0 });
    render(<FundingConditionsPanel applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Add from templates" }));
    expect(await screen.findByRole("status")).toHaveTextContent("No template conditions were added");
  });

  it("turns off 'Add from the lender's offer' with a reason when there is no offer", async () => {
    routes([]);
    render(<FundingConditionsPanel applicationId="app-1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Add from the lender's offer" })).toBeDisabled());
    expect(screen.getByTestId("conditions-no-offer")).toHaveTextContent("once a lender has sent an offer");
  });

  it("shows the missing-condition error next to the Condition field", async () => {
    routes([]);
    render(<FundingConditionsPanel applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Add" }));
    const field = screen.getByPlaceholderText("e.g. Signed insurance certificate");
    expect(field).toHaveAttribute("aria-invalid", "true");
    const label = field.closest("label")!;
    expect(within(label).getByRole("alert")).toHaveTextContent("Type the condition before you add it.");
    expect(h.post).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------------------------------------ 3. markdown
describe("Credit summary text (v884)", () => {
  it("renders **bold** as bold, never the asterisks", () => {
    render(<div data-testid="t" style={{ whiteSpace: "pre-wrap" }}>{renderInlineMarkdown("**Special Situation**\nThe file has a *prior* payout issue.\n## Public Search")}</div>);
    const box = screen.getByTestId("t");
    expect(box.textContent).not.toContain("*");
    expect(box.textContent).not.toContain("#");
    expect(within(box).getByText("Special Situation").tagName).toBe("STRONG");
    expect(within(box).getByText("prior").tagName).toBe("EM");
    expect(within(box).getByText("Public Search").tagName).toBe("STRONG");
  });
});

// ------------------------------------------------------------------------------------------------ 4. call scripts
describe("Settings > Call scripts (v884)", () => {
  it("hides 'Add starter intake scripts' once the starter scripts exist", async () => {
    const script = { id: "s1", silo: "BF", name: "Intake - term loan", description: null, use_for: "any", sections: [], position: 0, archived_at: null };
    h.get.mockResolvedValue({ silo: "BF", scripts: [script], question_types: [], custom_fields: {} });
    render(<CallScriptsSettings />);
    expect(await screen.findByTestId("starters-added")).toHaveTextContent("already added");
    expect(screen.queryByRole("button", { name: "Add starter intake scripts" })).toBeNull();
  });
});

// ------------------------------------------------------------------------------------------------ 6. setting names
describe("Server setting names (v884)", () => {
  const stripe = "Online payments are not set up on this server yet (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET).";
  it("cleans them out of staff text", () => {
    expect(settingNamesIn(stripe)).toEqual(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]);
    expect(withoutSettingNames(stripe)).toBe("Online payments are not set up on this server yet.");
    expect(plainSetupText("The corporate registry lookup is not set up (CORPORATIONS_CANADA_API_KEY).")).toBe("The corporate registry lookup is not set up. Ask an Admin.");
    expect(plainSetupText("QuickBooks is not set up on the server. Missing: QBO_CLIENT_ID, QBO_CLIENT_SECRET.")).not.toMatch(/QBO_/);
    expect(plainSetupText("IPINFO_TOKEN")).toBe("Not set up yet - ask an Admin.");
  });

  it("shows staff the plain sentence and Admins on a Settings page the names under Technical details", () => {
    const { unmount } = render(<SetupText text={stripe} adminPage testId="s" />);
    expect(screen.getByTestId("s").textContent).not.toMatch(/STRIPE_/);
    expect(screen.queryByTestId("technical-details")).toBeNull();
    unmount();
    h.role = "Admin";
    render(<SetupText text={stripe} adminPage testId="s" />);
    expect(screen.getByTestId("s")).toHaveTextContent("Online payments are not set up on this server yet.");
    expect(within(screen.getByTestId("technical-details")).getByText("Technical details")).toBeInTheDocument();
    expect(screen.getByTestId("technical-details")).toHaveTextContent("STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET");
  });
});

// ------------------------------------------------------------------------------------------------ 7, 8, 11. words and numbers
describe("Plain words and numbers (v884)", () => {
  it("turns codes into words", () => {
    expect(humanizeCode("application_started")).toBe("Application started");
    expect(humanizeCode("contact_form")).toBe("Contact form");
    expect(humanizeCode("TERM_LOAN")).toBe("Term loan");
    expect(humanizeCode("LINE_OF_CREDIT")).toBe("Line of credit");
    expect(humanizeCode("MERCHANT_CASH_ADVANCE")).toBe("Merchant cash advance");
    expect(humanizeCode("SBA_GOVERNMENT")).toBe("SBA / Government");
    expect(humanizeCode("EQUIPMENT")).toBe("Equipment finance");
    expect(humanizeCode("TERM")).toBe("Term loan");
    expect(humanizeCode("client_direct")).toBe("Client (direct)");
    expect(humanizeCode("personal_net_worth")).toBe("Personal net worth statement");
    expect(humanizeCode("pending_payment")).toBe("Waiting for payment");
    expect(humanizeCode("canceled")).toBe("Cancelled");
    expect(humanizeCode("Already plain words")).toBe("Already plain words");
    expect(humanizeCodesInText("Status changed from pending_payment to canceled")).toBe("Status changed from waiting for payment to cancelled");
    expect(isInternalCode("exp--abc123")).toBe(true);
    expect(isInternalCode("BIGBROKER")).toBe(false);
  });

  it("formats money, IP addresses, dates and typed amounts", () => {
    expect(formatMoneyValue("2200000")).toBe("$2,200,000");
    expect(formatMoneyValue("230436.87")).toBe("$230,436.87");
    expect(formatMoneyValue("Receivable (A/R)")).toBe("Receivable (A/R)");
    expect(groupDigits("2200000")).toBe("2,200,000");
    expect(groupDigits("1234.5")).toBe("1,234.5");
    expect(stripIpPort("70.65.192.23:63761")).toBe("70.65.192.23");
    expect(stripIpPort("[2001:db8::1]:443")).toBe("2001:db8::1");
    expect(stripIpPort("2001:db8::1")).toBe("2001:db8::1");
    expect(formatDateTimeShort("2026-11-02T21:11:13Z")).not.toMatch(/:\d\d:\d\d/);
  });

  it("names Alberta's time zone the way staff expect", () => {
    expect(zoneWords("America/Regina", "Alberta time")).toBe("Alberta time (America/Edmonton)");
    expect(zoneWords("Etc/GMT+6", "Alberta time")).toBe("Alberta time (America/Edmonton)");
    expect(zoneWords("America/Toronto", "Ontario time")).toBe("Ontario time (America/Toronto)");
  });
});
