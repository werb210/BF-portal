// BF_PORTAL_v878_NAV_REVENUE - Revenue page tabs and CRM's Active Contracts tab.
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/pages/reports/ReportDataCards", () => ({ ReportDataCard: ({ report }: { report: string }) => <div data-testid="card">{report}</div> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "Admin" } }) }));
vi.mock("../DealsAndPay", () => ({ default: () => <div data-testid="deals" /> }));
vi.mock("@/features/activeContracts/PortfolioReport", () => ({ default: () => <div data-testid="portfolio">portfolio</div> }));

import RevenuePage from "../RevenuePage";
import { CrmTabs } from "@/pages/crm/CRMPage";

describe("Revenue", () => {
  it("opens on the forecast and switches tabs", () => {
    render(<RevenuePage />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Forecast", "Commission & fees", "Contract portfolio", "Goals", "Deals & pay"]);
    expect(screen.getAllByTestId("card").map((c) => c.textContent)).toEqual(["forecast", "revenue_forecast"]);
    fireEvent.click(screen.getByRole("tab", { name: "Commission & fees" }));
    expect(screen.getAllByTestId("card").map((c) => c.textContent)).toContain("commission_receivable");
    fireEvent.click(screen.getByRole("tab", { name: "Contract portfolio" }));
    expect(screen.getByTestId("portfolio")).toBeTruthy();
  });
});

describe("CRM tabs", () => {
  const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={<CrmTabs />} /></Routes></MemoryRouter>);
  it("shows Contacts & companies and Active Contracts on the list pages", () => {
    at("/crm/active-contracts");
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Contacts & companies", "Active Contracts"]);
    expect(screen.getByRole("tab", { name: "Active Contracts" }).getAttribute("aria-selected")).toBe("true");
  });
  it("is hidden on a single record", () => {
    at("/crm/contacts/abc");
    expect(screen.queryByRole("tablist")).toBeNull();
  });
});
