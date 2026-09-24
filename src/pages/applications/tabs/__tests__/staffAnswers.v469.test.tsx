// BF_PORTAL_BLOCK_v469_STAFF_ANSWERS
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(async () => ({})) }));
vi.mock("@/api", () => ({ api: apiMock }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "Admin" } }) }));
vi.mock("@/auth/can", () => ({ canWrite: (role: string | null) => role === "Admin" }));

import ProductQuestionsPanel from "../ProductQuestionsPanel";

const gaps = {
  set: "loc_accord", setLabel: "Line of Credit", missing: ["business.mailingSame"], submittedAt: null,
  questions: [
    { id: "business.mailingSame", key: "mailingSame", label: "Is the mailing address the same as the operating address?", type: "yesno", section: "business", required: true, ownerIndex: null, ownerName: null, value: "" },
  ],
};

describe("v469 staff answer a blank question", () => {
  it("shows Answer on a blank question and saves the chosen answer", async () => {
    apiMock.get.mockResolvedValue(gaps);
    render(<ProductQuestionsPanel applicationId="app-9" />);
    const answer = await screen.findByRole("button", { name: "Answer Is the mailing address the same as the operating address?" });
    fireEvent.click(answer);
    const select = screen.getByLabelText("Edit Is the mailing address the same as the operating address?") as HTMLSelectElement;
    expect(select.value).toBe("");
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(select, { target: { value: "Yes" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledWith("/api/applications/app-9/product-questions", { answers: { "business.mailingSame": "Yes" } }));
  });
});
