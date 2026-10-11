// BF_PORTAL_V785 - Oct 11 follow-up fixes.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { existsSync } from "node:fs";

const { post, siloGet } = vi.hoisted(() => ({ post: vi.fn(), siloGet: vi.fn() }));
vi.mock("@/api", () => ({
  api: { post },
  apiForSilo: (silo: string) => ({ get: (path: string) => siloGet(silo, path) }),
}));

import GlobalAdmin from "@/pages/GlobalAdmin";
import CreditReadiness from "@/pages/CreditReadiness";
import CapitalScorePreview from "@/components/CapitalScorePreview";

describe("v785 follow-up fixes", () => {
  beforeEach(() => {
    post.mockReset();
    siloGet.mockReset();
  });

  it("1: Credit Readiness sends the server field names and shows the link, score and tier", async () => {
    post.mockResolvedValue({
      success: true,
      leadId: "lead-1",
      redirect: "https://client.example/apply?lead=lead-1",
      readinessScore: 81,
      readinessTier: "Strong",
    });
    const { container } = render(<CreditReadiness />);
    const selects = Array.from(container.querySelectorAll("select")) as HTMLSelectElement[];
    const picks = ["1 to 3 Years", "$500,001 to $1,000,000", "$30,001 to $100,000", "Zero to $100,000"];
    picks.forEach((value, i) => fireEvent.change(selects[i]!, { target: { value } }));
    const collateral = selects[4]!.querySelectorAll("option")[1]!.textContent as string;
    fireEvent.change(selects[4]!, { target: { value: collateral } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [path, body] = post.mock.calls[0]!;
    expect(path).toBe("/api/website/credit-readiness");
    expect(body).toMatchObject({
      salesHistoryYears: "1 to 3 Years",
      annualRevenueRange: "$500,001 to $1,000,000",
      avgMonthlyRevenueRange: "$30,001 to $100,000",
      accountsReceivableRange: "Zero to $100,000",
      fixedAssetsValueRange: collateral,
    });
    for (const old of ["yearsInBusiness", "annualRevenue", "monthlyRevenue", "arBalance", "availableCollateral"]) {
      expect(body).not.toHaveProperty(old);
    }
    expect(await screen.findByText("Score: 81")).toBeInTheDocument();
    expect(screen.getByText("Readiness: Strong")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://client.example/apply?lead=lead-1" })).toBeInTheDocument();
  });

  it("1: Credit Readiness hides the score and tier lines when they are missing", async () => {
    post.mockResolvedValue({ success: true, redirect: "https://client.example/apply" });
    const { container } = render(<CreditReadiness />);
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    expect(await screen.findByRole("link", { name: "https://client.example/apply" })).toBeInTheDocument();
    expect(screen.queryByText(/^Score:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Readiness:/)).not.toBeInTheDocument();
  });

  it("2: Capital score sends annualRevenue and yearsInBusiness and shows the message", async () => {
    post.mockResolvedValue({ score: 74, message: "Good fit for a line of credit" });
    const { container } = render(<CapitalScorePreview />);
    expect(screen.queryByLabelText("Credit score")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Months in business")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Acme Ltd" } });
    fireEvent.change(screen.getByLabelText("Annual revenue"), { target: { value: "750000" } });
    fireEvent.change(screen.getByLabelText("Years in business"), { target: { value: "4" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [path, body] = post.mock.calls[0]!;
    expect(path).toBe("/api/credit/score");
    expect(body).toMatchObject({ companyName: "Acme Ltd", annualRevenue: 750000, yearsInBusiness: 4 });
    for (const old of ["revenue", "timeInBusiness", "creditScore"]) expect(body).not.toHaveProperty(old);
    expect(await screen.findByText("Score: 74")).toBeInTheDocument();
    expect(screen.getByText("Good fit for a line of credit")).toBeInTheDocument();
    expect(screen.queryByText(/^Rating:/)).not.toBeInTheDocument();
  });

  it("3: Global Admin sums the SLF byStage counts from /api/slf/stats", async () => {
    siloGet.mockImplementation(async (silo: string, path: string) => {
      if (silo === "BF") return [];
      if (silo === "BI") return [];
      if (silo === "SLF" && path === "/api/slf/stats") {
        return { byStage: [{ stage: "new", n: "120" }, { stage: "funded", n: 35 }, { stage: "lost", n: "7" }], byFamily: [], recentSyncs: [] };
      }
      throw new Error("unexpected " + silo + " " + path);
    });
    render(<GlobalAdmin />);
    expect(await screen.findByText("SLF deal count: 162")).toBeInTheDocument();
  });

  it("3: Global Admin keeps the unavailable fallback for SLF", async () => {
    siloGet.mockImplementation(async (silo: string) => {
      if (silo === "SLF") throw new Error("SLF down");
      return [];
    });
    render(<GlobalAdmin />);
    expect(await screen.findByText("SLF deal count: unavailable")).toBeInTheDocument();
  });

  it("4: the unused chat types file is gone", () => {
    expect(existsSync("src/modules/chat/types.ts")).toBe(false);
  });
});
