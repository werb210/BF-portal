// BF_PORTAL_v900_IMPORT_OWNER - the contact import reads an Owner column.
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const post = vi.fn(async () => ({ created: 1, updated: 0, skipped: 0, total: 1, owners_unmatched: ["Nobody Here"] }));
vi.mock("@/api", () => ({ api: { post: (...a: unknown[]) => (post as any)(...a) } }));

import ImportContactsModal from "../ImportContactsModal";

// jsdom's File has no text(); read it the way a browser would.
if (!(File.prototype as any).text) {
  (File.prototype as any).text = function (this: Blob) {
    return new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsText(this); });
  };
}

describe("contact import Owner column", () => {
  it("auto-maps a HubSpot 'Contact owner' column, sends it, and shows unmatched owners", async () => {
    const { container } = render(<ImportContactsModal onClose={() => undefined} onDone={() => undefined} />);
    const csv = "Email,First Name,Contact owner\nann@acme.test,Ann,Andrew Sample\n";
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([csv], "hubspot.csv", { type: "text/csv" })] } });
    const label = await screen.findByText("Owner (staff email or name)");
    const select = label.parentElement!.querySelector("select") as HTMLSelectElement;
    expect(select.value).toBe("2");
    const emailSelect = screen.getByText("Email", { selector: "span" }).parentElement!.querySelector("select") as HTMLSelectElement;
    expect(emailSelect.value).toBe("0");
    fireEvent.click(screen.getByRole("button", { name: /^Import/ }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    const body = (post.mock.calls[0] as unknown[])[1] as { rows: Array<Record<string, string>> };
    expect(body.rows[0]).toMatchObject({ email: "ann@acme.test", owner: "Andrew Sample" });
    expect(await screen.findByTestId("import-owners-unmatched")).toHaveTextContent("Nobody Here");
  });
});
