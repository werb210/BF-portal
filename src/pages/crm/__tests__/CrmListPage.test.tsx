import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CrmListPage from "@/pages/crm/CrmListPage";
import SiloContext from "@/context/SiloContext"; // BF_PORTAL_CRM_TEST_SILO_PROVIDER_v1

vi.mock("@/pages/crm/contacts/ContactsPage", () => ({
  default: () => <div>Contacts list</div>,
}));

vi.mock("@/pages/crm/companies/CompaniesPage", () => ({
  default: () => <div>Companies list</div>,
}));

describe("CrmListPage", () => {
  it("swaps between contacts and companies", async () => {
    const user = userEvent.setup();
    // BF_PORTAL_CRM_TEST_SILO_PROVIDER_v1 - CrmListPage calls useSilo(); provide context.
    render(
      <SiloContext.Provider value={{ silo: "bf", setSilo: () => {} }}>
        <CrmListPage />
      </SiloContext.Provider>,
    );

    expect(screen.getByText("Contacts list")).toBeInTheDocument();
    expect(screen.queryByText("Companies list")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Companies" }));
    expect(screen.getByText("Companies list")).toBeInTheDocument();
    expect(screen.queryByText("Contacts list")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Contacts" }));
    expect(screen.getByText("Contacts list")).toBeInTheDocument();
  });
});
