// BF_PORTAL_ACCEPT_CATEGORY_v318
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(async () => ({})) }));
vi.mock("@/api", () => ({ api }));

import AcceptNameDialog, { categoryChoices } from "../AcceptNameDialog";
import { clampDockPercent } from "@/dialer/components/FloatingDialerButton";

describe("Accept document dialog category", () => {
  it("keeps an unlisted current category selectable", () => {
    expect(categoryChoices(["A/R", "A/P"], "bank_statements")).toEqual(["bank_statements", "A/R", "A/P"]);
    expect(categoryChoices(["A/R", "A/P"], "a/r")).toEqual(["A/R", "A/P"]);
  });

  it("moves the document, tells the tab, and refreshes the suggested name", async () => {
    api.get.mockResolvedValue({ parts: { businessName: "Voss Events, Inc.", documentType: "A/R", period: null, extension: ".pdf" } });
    const onMoved = vi.fn();
    render(<AcceptNameDialog documentId="d1" originalFilename="x.pdf" working={false} onCancel={vi.fn()} onConfirm={vi.fn()} category="A/R" categories={["A/R", "6 months business banking statements"]} onMoved={onMoved} />);
    await waitFor(() => expect(screen.getByTestId("accept-category")).toBeTruthy());
    fireEvent.change(screen.getByTestId("accept-category"), { target: { value: "6 months business banking statements" } });
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/documents/d1/category", { category: "6 months business banking statements" }));
    await waitFor(() => expect(onMoved).toHaveBeenCalledWith("6 months business banking statements"));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });
});

describe("dialer button", () => {
  it("docks on the right edge within the screen, away from the bottom-right corner", () => {
    expect(clampDockPercent(95)).toBe(88);
    expect(clampDockPercent(2)).toBe(12);
    expect(clampDockPercent(Number.NaN)).toBe(62);
    const fab = fs.readFileSync(path.resolve(__dirname, "../../../dialer/components/FloatingDialerButton.tsx"), "utf8");
    expect(fab).toContain("top: `${topPct}%`");
    expect(fab).not.toContain('bottom: "calc(24px');
  });
});
