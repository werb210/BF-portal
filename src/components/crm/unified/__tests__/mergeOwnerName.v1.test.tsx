// BF_PORTAL_MERGE_OWNER_NAME_v1 - the merge dialog shows the owner's name, not the staff user id.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/api", () => {
  const fn: any = vi.fn(async () => ({}));
  fn.get = (...a: unknown[]) => h.get(...a);
  fn.post = vi.fn(async () => ({}));
  fn.patch = vi.fn(async () => ({}));
  fn.delete = vi.fn(async () => ({}));
  return { api: fn, default: fn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: "Admin" } }) }));

import { BI_CRM_BACKEND } from "../crmUnifiedApi";
import { CrmMergeDialog, shownValue } from "../CrmDuplicates";

describe("merge dialog owner", () => {
  it("maps owner ids to names", () => {
    expect(shownValue("outreach_owner_id", "u-9", { "u-9": "Todd Werboweski" })).toBe("Todd Werboweski");
    expect(shownValue("outreach_owner_id", "u-x", {})).toBe("Unknown user");
    expect(shownValue("email", "a@b.co", {})).toBe("a@b.co");
    expect(shownValue("owner_id", null, {})).toBeNull();
  });

  it("renders the owner's name in the field choice", async () => {
    h.get.mockImplementation(async (path: string) => {
      if (path === "/api/users") return { users: [{ id: "00000000-0000-0000-0000-000000000099", first_name: "Todd", last_name: "Werboweski" }] };
      return {
        records: [{ id: "a", title: "Ann Lee", tags: [], created_at: null, application_count: 0 }, { id: "b", title: "Ann Lee", tags: [], created_at: null, application_count: 0 }],
        fields: [{ key: "outreach_owner_id", label: "Owner", values: [
          { id: "a", value: "00000000-0000-0000-0000-000000000099", display: "00000000-0000-0000-0000-000000000099" },
          { id: "b", value: null, display: null },
        ] }],
      };
    });
    render(<MemoryRouter><CrmMergeDialog backend={BI_CRM_BACKEND} entity="contact" ids={["a", "b"]} onClose={() => undefined} onMerged={() => undefined} /></MemoryRouter>);
    expect(await screen.findByText("Todd Werboweski")).toBeInTheDocument();
    expect(screen.queryByText("00000000-0000-0000-0000-000000000099")).toBeNull();
  });
});
