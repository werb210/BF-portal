import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactsPage from "../contacts/ContactsPage";
import CompaniesPage from "../companies/CompaniesPage";
import TimelineFeed from "../timeline/TimelineFeed";
import VoiceDialer from "@/components/dialer/VoiceDialer";
import IncomingCallToast from "@/components/dialer/IncomingCallToast";
import SMSComposer from "@/components/sms/SMSComposer";
import EmailViewer from "@/components/email/EmailViewer";
import { renderWithProviders } from "@/test/testUtils";
import { useCrmStore } from "@/state/crm.store";
import { useDialerStore } from "@/state/dialer.store";
import type { Contact } from "@/api/crm";

const janeContact: Contact = {
  id: "c1",
  name: "Jane Doe",
  phone: "+1-555-111-2222",
  email: "jane@example.com",
  silo: "BF",
  owner: "Alex",
  tags: ["VIP"],
  hasActiveApplication: true,
  companyIds: ["co1"],
  applicationIds: ["app-1001"]
};

vi.mock("@/api/crm", async () => {
  const actual = await vi.importActual<typeof import("@/api/crm")>("@/api/crm");
  const company = {
    id: "co1",
    name: "Boreal Finance",
    silo: "BF" as const,
    industry: "Financial Services",
    owner: "Alex",
    tags: ["Priority"],
    contactIds: ["c1"]
  };
  return {
    ...actual,
    fetchContacts: vi.fn(async () => [janeContact]),
    fetchCompanies: vi.fn(async () => [company]),
    fetchApplications: vi.fn(async () => [{ id: "app-1001", stage: "SUBMITTED", contactId: "c1" }]),
    fetchContactCompanies: vi.fn(async () => [company]),
    fetchCompanyContacts: vi.fn(async () => [janeContact]),
    fetchTimeline: vi.fn(async () => [
      { id: "t-call", entityId: "c1", entityType: "contact", type: "call", occurredAt: "2026-03-01T12:00:00.000Z", summary: "Outbound call to Jane" },
      { id: "t-sms", entityId: "c1", entityType: "contact", type: "sms", occurredAt: "2026-03-01T11:55:00.000Z", summary: "SMS from Jane" },
      { id: "t-email", entityId: "c1", entityType: "contact", type: "email", occurredAt: "2026-03-01T11:50:00.000Z", summary: "Sent approval docs" },
      { id: "t-note", entityId: "c1", entityType: "contact", type: "note", occurredAt: "2026-03-01T11:45:00.000Z", summary: "Internal note" },
      { id: "t-document", entityId: "c1", entityType: "contact", type: "document", occurredAt: "2026-03-01T11:40:00.000Z", summary: "Document uploaded" },
      { id: "t-status", entityId: "c1", entityType: "contact", type: "status", occurredAt: "2026-03-01T11:35:00.000Z", summary: "Status changed" },
      { id: "t-ai", entityId: "c1", entityType: "contact", type: "ai", occurredAt: "2026-03-01T11:30:00.000Z", summary: "AI recommendation" },
      { id: "t-lender", entityId: "c1", entityType: "contact", type: "lender", occurredAt: "2026-03-01T11:25:00.000Z", summary: "Lender update" },
      { id: "t-system", entityId: "c1", entityType: "contact", type: "system", occurredAt: "2026-03-01T11:20:00.000Z", summary: "System action" },
      {
        id: "t-auto-1",
        entityId: "c1",
        entityType: "contact",
        type: "RULE_TRIGGERED",
        occurredAt: "2026-03-01T10:00:00.000Z",
        summary: "Important email not opened",
        automation: { ruleId: "rule-1", triggerReason: "No response", delayCondition: "24h", action: "Send reminder" }
      },
      {
        id: "t-auto-2",
        entityId: "c1",
        entityType: "contact",
        type: "AUTO_SMS_SENT",
        occurredAt: "2026-03-01T09:58:00.000Z",
        summary: "SMS reminder sent",
        automation: { ruleId: "rule-1", triggerReason: "No response", delayCondition: "24h", action: "Send reminder" }
      }
    ])
  };
});

afterEach(() => {
  act(() => {
    useCrmStore.setState({
      silo: "BF",
      filters: { search: "", owner: null, hasActiveApplication: false }
    });
  });
});

describe("CRM Contacts", () => {
  it("renders contact list with search and filters", async () => {
    renderWithProviders(<ContactsPage />);
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Search");
    await userEvent.type(searchInput, "Jane");
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();

    const ownerFilter = screen.getByTestId("owner-filter");
    fireEvent.change(ownerFilter, { target: { value: "Alex" } });
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
  });

  it("opens and closes contact drawer", async () => {
    renderWithProviders(<ContactsPage />);
    const detailsButton = await screen.findByText("Details");
    await userEvent.click(detailsButton);
    expect(await screen.findByTestId("contact-drawer")).toBeInTheDocument();

    const closeButton = screen.getByText("Close");
    await userEvent.click(closeButton);
    await waitFor(() => expect(screen.queryByTestId("contact-drawer")).not.toBeInTheDocument());
  });

  it("mounts the calling interface", async () => {
    renderWithProviders(
      <>
        <ContactsPage />
        <VoiceDialer />
      </>
    );
    const detailsButton = await screen.findByText("Details");
    await userEvent.click(detailsButton);
    const drawer = await screen.findByTestId("contact-drawer");
    const callButton = await within(drawer).findByText("Call");
    await userEvent.click(callButton);
    expect(await screen.findByTestId("voice-dialer")).toBeInTheDocument();
  });

  it("filters by silo", async () => {
    const { rerender } = renderWithProviders(<ContactsPage />);
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    act(() => {
      useCrmStore.getState().setSilo("SLF");
    });
    rerender(<ContactsPage />);
    await waitFor(() => expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument());
  });
});

describe("CRM Companies", () => {
  it("renders companies list and drawer", async () => {
    renderWithProviders(<CompaniesPage />);
    expect(await screen.findByText("Boreal Finance")).toBeInTheDocument();
    const detailsButton = await screen.findByText("Details");
    await userEvent.click(detailsButton);
    expect(await screen.findByTestId("company-drawer")).toBeInTheDocument();
  });
});

describe("Communications", () => {
  it("shows incoming call toast", () => {
    render(
      <IncomingCallToast
        from="+1-555-999-0000"
        onAccept={() => undefined}
        onDismiss={() => undefined}
        onViewRecord={() => undefined}
      />
    );
    expect(screen.getByTestId("incoming-call-toast")).toBeInTheDocument();
  });

  it("renders SMS thread and composer", async () => {
    renderWithProviders(<SMSComposer visible contact={janeContact} onClose={() => undefined} />);
    expect(await screen.findByTestId("sms-thread")).toBeInTheDocument();
  });

  it("renders email viewer", async () => {
    renderWithProviders(<EmailViewer visible contactId="c1" onClose={() => undefined} />);
    expect(await screen.findByTestId("email-viewer")).toBeInTheDocument();
    expect(await screen.findByTestId("email-body")).toBeInTheDocument();
  });
});

describe("Timeline", () => {
  it("merges all event types", async () => {
    renderWithProviders(<TimelineFeed entityId="c1" entityType="contact" />);
    const items = await screen.findAllByTestId(/timeline-/);
    expect(items.length).toBeGreaterThan(0);
    const types = [
      "Outbound call to Jane",
      "SMS from Jane",
      "Sent approval docs",
      "Internal note",
      "Document uploaded",
      "Status changed",
      "AI recommendation",
      "Lender update",
      "System action"
    ];
    for (const summary of types) {
      expect(await screen.findByText(summary)).toBeInTheDocument();
    }
  });

  it("groups automated events under an automations cluster", async () => {
    renderWithProviders(<TimelineFeed entityId="c1" entityType="contact" />);
    const automationGroups = await screen.findAllByTestId(/automation-group-/);
    const targetGroup = automationGroups.find((group) => within(group).queryByText("Important email not opened")) ?? automationGroups[0];
    const groupToggle = within(targetGroup).getByRole("button");
    expect(groupToggle).toBeInTheDocument();
    await userEvent.click(groupToggle);
    expect(await screen.findAllByText("Important email not opened")).not.toHaveLength(0);
    expect(await screen.findAllByText("SMS reminder sent")).not.toHaveLength(0);
  });

  it("shows manual events alongside automated clusters", async () => {
    renderWithProviders(<TimelineFeed entityId="c1" entityType="contact" />);
    expect(await screen.findByText("Outbound call to Jane")).toBeInTheDocument();
  });

  it("hides automation metadata for non-staff roles", async () => {
    renderWithProviders(<TimelineFeed entityId="c1" entityType="contact" />, {
      auth: { user: { id: "lender-1", email: "lender@example.com", role: "Lender" } }
    });
    const automationGroups = await screen.findAllByTestId(/automation-group-/);
    const targetGroup = automationGroups.find((group) => within(group).queryByText("Important email not opened")) ?? automationGroups[0];
    const groupToggle = within(targetGroup).getByRole("button");
    await userEvent.click(groupToggle);
    const automationItems = await within(targetGroup).findAllByTestId(/timeline-/);
    await userEvent.click(automationItems[0]);
    expect(await screen.findByText("Automation metadata is restricted to staff.")).toBeInTheDocument();
    expect(screen.queryByText("Rule ID")).not.toBeInTheDocument();
  });
});

describe("Standalone Dialer", () => {
  it("requests token and shows status", async () => {
    renderWithProviders(<VoiceDialer />);
    act(() => {
      useDialerStore.getState().openDialer({ contactId: janeContact.id, contactName: janeContact.name });
    });
    expect(await screen.findByTestId("voice-dialer")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Ready/i)).toBeInTheDocument());
  });
});
