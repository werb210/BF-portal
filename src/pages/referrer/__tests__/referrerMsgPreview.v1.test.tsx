// BF_PORTAL_REFERRER_MSG_PREVIEW_TRUTH_v1
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
// The add-referral modal must preview the SMS copy BF-Server actually sends, with
// the referrer's own name (from /api/referrer/me) interpolated into version A.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.put = vi.fn();
  apiFn.patch = vi.fn();
  apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));

import ReferrerPortal from "../ReferrerPortal";

function mockApi(me: unknown) {
  h.apiFn.mockImplementation(async (path: string) => {
    if (path === "/api/referrer/me") return me;
    if (path === "/api/referrer/pipeline") return { referrals: [] };
    return {};
  });
}

async function openModal() {
  render(
    <MemoryRouter>
      <ReferrerPortal />
    </MemoryRouter>,
  );
  await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/referrer/me", expect.anything()));
  fireEvent.click(screen.getByRole("button", { name: "+ Add referral" }));
}

describe("BF_PORTAL_REFERRER_MSG_PREVIEW_TRUTH_v1", () => {
  beforeEach(() => {
    h.apiFn.mockReset();
    sessionStorage.setItem("referrer_token", "tok");
  });

  it("previews the copy the server actually sends", async () => {
    mockApi({ profile: { full_name: "Jane Referrer" } });
    await openModal();
    expect(
      await screen.findByText(/^Jane Referrer referred you to Boreal Financial\. They help businesses like yours get funding fast/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^You have been referred to Boreal Financial for business funding\. Start whenever you are ready/),
    ).toBeInTheDocument();
    expect(screen.getAllByText("+ their personal application link")).toHaveLength(2);
  });

  it("drops the old copy that was never sent", async () => {
    mockApi({ profile: { full_name: "Jane Referrer" } });
    await openModal();
    await screen.findByText(/^Jane Referrer referred you/);
    expect(screen.queryByText(/Hi, it's your referrer/)).toBeNull();
  });

  it("interpolates the referrer's own name into version A, read from /api/referrer/me", async () => {
    mockApi({ profile: { full_name: "  Sam Smith  " } });
    await openModal();
    expect(await screen.findByText(/^Sam Smith referred you to Boreal Financial\./)).toBeInTheDocument();
    expect(h.apiFn).toHaveBeenCalledWith(
      "/api/referrer/me",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } }),
    );
  });
});
