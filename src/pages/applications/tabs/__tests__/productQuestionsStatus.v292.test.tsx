// BF_PORTAL_PRODUCT_QUESTIONS_v292
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(async () => ({})) }));
vi.mock("@/api", () => ({ api: apiMock }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "Admin" } }) }));
vi.mock("@/auth/can", () => ({ canWrite: () => true }));

import ProductQuestionsPanel, { groupTitle, waitingMessage } from "../ProductQuestionsPanel";
import { productQuestionsBlock } from "../LendersTab";

const gaps = {
  set: "loc_accord", setLabel: "Line of Credit", submittedAt: null, missing: ["owner.0.ownRent"],
  questions: [
    { id: "business.fiscalYearEnd", key: "fiscalYearEnd", label: "Fiscal year-end month", type: "month", section: "business", required: true, ownerIndex: null, ownerName: null, value: "December" },
    { id: "owner.0.ownRent", key: "ownRent", label: "Own or rent your home?", type: "select", options: ["Own", "Rent"], section: "owner", required: true, ownerIndex: 0, ownerName: "Tanya Voss", value: "" },
  ],
};

describe("status text", () => {
  it("explains the send block and groups owners by name", () => {
    expect(waitingMessage(gaps as any)).toBe("Waiting on client: 1 Line of Credit question still need answers before this can be sent to lenders.");
    expect(groupTitle(gaps.questions[1] as any)).toBe("Owner: Tanya Voss");
    expect(productQuestionsBlock({ product_questions: { blocking: true, message: "Waiting on client: 14 Line of Credit questions" } })).toContain("14 Line of Credit");
    expect(productQuestionsBlock({ product_questions: { blocking: false } })).toBeNull();
  });
});

describe("Application tab panel", () => {
  it("lets staff edit an answer and answer a blank one (v469)", async () => {
    apiMock.get.mockResolvedValue(gaps);
    render(<ProductQuestionsPanel applicationId="app-1" />);
    await waitFor(() => expect(screen.getByText("Line of Credit questions")).toBeTruthy());
    expect(screen.getByText("Waiting on client")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Edit / })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /^Answer / }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Edit Fiscal year-end month" }));
    fireEvent.change(screen.getByLabelText("Edit Fiscal year-end month"), { target: { value: "March" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledWith("/api/applications/app-1/product-questions", { answers: { "business.fiscalYearEnd": "March" } }));
  });
  it("renders nothing when the category needs no questions", async () => {
    apiMock.get.mockResolvedValue({ set: null, setLabel: null, missing: [], submittedAt: null, questions: [] });
    const { container } = render(<ProductQuestionsPanel applicationId="app-2" />);
    await waitFor(() => expect(apiMock.get).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="product-questions-panel"]')).toBeNull();
  });
});

describe("wiring", () => {
  it("the Lenders tab shows the reason and disables Send; the Application tab shows the panel", () => {
    const lenders = fs.readFileSync(path.resolve(__dirname, "../LendersTab.tsx"), "utf8");
    expect(lenders).toContain('data-testid="product-questions-waiting"');
    expect(lenders).toContain("isStale || !!productQuestionsBlock(envelope)}");
    expect(fs.readFileSync(path.resolve(__dirname, "../ApplicationTab.tsx"), "utf8")).toContain("<ProductQuestionsPanel applicationId=");
  });
});
