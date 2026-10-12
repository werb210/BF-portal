// BF_PORTAL_TEMPLATE_SAVE_BY_NAME_v8
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

vi.mock("@/silos/bi/marketing/tabs/SequencesTab", () => ({ default: () => <div>sequence list</div> }));
vi.mock("@/components/marketing/LinkClicksPanel", () => ({ default: () => <div>link clicks</div> }));

import BrandedEmailComposer from "../BrandedEmailComposer";
import BIMarketing from "@/silos/bi/marketing/BIMarketing";

const BASE = "/api/v1/bi/marketing";
const template = {
  id: "t1",
  name: "Spring promo",
  subject: "Spring is here",
  body: "Hello",
  html: null,
  landingUrl: null,
  fields: { headline: "Spring" },
};

let saveResponse: unknown = {};

beforeAll(() => {
  // jsdom has no ResizeObserver; the composer observes its preview pane.
  (globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
});

beforeEach(() => {
  h.apiFn.get.mockReset();
  h.apiFn.post.mockReset();
  saveResponse = {};
  h.apiFn.get.mockImplementation(async (url: string) => {
    if (url === `${BASE}/email/segments`) return { configured: true, all: 3, segments: [] };
    if (url === `${BASE}/templates?channel=email`) return { items: [template] };
    return {};
  });
  h.apiFn.post.mockImplementation(async (url: string) => {
    if (url === `${BASE}/templates`) return saveResponse;
    return { html: "<p>preview</p>" };
  });
});

async function pickTemplate() {
  render(<BrandedEmailComposer apiBase={BASE} />);
  const picker = await screen.findByLabelText(/Load template/);
  fireEvent.change(picker, { target: { value: "t1" } });
  return screen.getByPlaceholderText("Template name") as HTMLInputElement;
}

function saveCalls() {
  return h.apiFn.post.mock.calls.filter((c: unknown[]) => c[0] === `${BASE}/templates`);
}

describe("editing and re-saving a template", () => {
  it("prefills the name box when a template is picked", async () => {
    const name = await pickTemplate();
    expect(name.value).toBe("Spring promo");
  });

  it("no longer clears the name after saving, and saves under the same name", async () => {
    const name = await pickTemplate();
    fireEvent.click(screen.getByRole("button", { name: "Save to library" }));
    expect(await screen.findByText("Email template saved to library.")).toBeInTheDocument();
    expect(name.value).toBe("Spring promo");
    expect(saveCalls()).toHaveLength(1);
    expect(saveCalls()[0]![1]).toMatchObject({ channel: "email", name: "Spring promo", subject: "Spring is here" });
  });

  it("reports whether the save replaced an existing template", async () => {
    saveResponse = { data: { replaced: true } };
    await pickTemplate();
    fireEvent.click(screen.getByRole("button", { name: "Save to library" }));
    expect(await screen.findByText("Email template updated to library.")).toBeInTheDocument();
  });

  it("also reads replaced from an unwrapped response", async () => {
    saveResponse = { replaced: true };
    await pickTemplate();
    fireEvent.click(screen.getByRole("button", { name: "Save to library" }));
    await waitFor(() => expect(screen.getByText("Email template updated to library.")).toBeInTheDocument());
  });
});

describe("BF_PORTAL_APOLLO_OFF_v10", () => {
  it("drops the Apollo tab entirely", () => {
    render(<BIMarketing />);
    const tabs = screen.getAllByRole("tab").map((t) => t.textContent);
    expect(tabs).toEqual(["Email", "Sequences", "Links"]);
    expect(screen.queryByText(/apollo/i)).not.toBeInTheDocument();
  });

  it("opens on Email instead of a dead default tab", async () => {
    render(<BIMarketing />);
    expect(screen.getByRole("tab", { name: "Email" })).toHaveAttribute("aria-selected", "true");
    // The real composer is mounted against the BI API base.
    await waitFor(() => expect(h.apiFn.get).toHaveBeenCalledWith(`${BASE}/email/segments`));
    expect(await screen.findByPlaceholderText("Template name")).toBeInTheDocument();
  });
});
