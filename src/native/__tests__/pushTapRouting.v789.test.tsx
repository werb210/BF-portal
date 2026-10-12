// BF_PORTAL_v789_PUSH_ROUTING - notification taps route plain BF-Server paths and bfportal: links.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const h = vi.hoisted(() => ({ onOpen: null as null | ((url: string, actionId?: string) => void) }));
vi.mock("@/native/pushNotifications", () => ({
  registerPushNotifications: vi.fn(async (cb: (url: string, actionId?: string) => void) => {
    h.onOpen = cb;
    return { result: { state: "unsupported" }, remove: async () => undefined };
  }),
}));
vi.mock("@/native/WidgetSnapshotProvider", async () => {
  const real = await vi.importActual<Record<string, unknown>>("@/native/WidgetSnapshotProvider");
  return { widgetRoute: real.widgetRoute };
});

import PushNotificationsProvider, { pushTapRoute } from "@/native/PushNotificationsProvider";

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

beforeEach(() => { h.onOpen = null; });

describe("pushTapRoute", () => {
  it("accepts the plain paths BF-Server sends", () => {
    expect(pushTapRoute("/applications/123")).toBe("/applications/123");
    expect(pushTapRoute("/tasks?view=overdue")).toBe("/tasks?view=overdue");
  });
  it("keeps bfportal: widget links working", () => {
    expect(pushTapRoute("bfportal://applications?silo=BF")).toBe("/pipeline");
    expect(pushTapRoute("bfportal://tasks?view=due_today")).toBe("/tasks?view=due_today");
  });
  it("never follows an external or odd link", () => {
    expect(pushTapRoute("https://evil.example/x")).toBe("/");
    expect(pushTapRoute("//evil.example")).toBe("/");
    expect(pushTapRoute("/a/../../etc")).toBe("/");
  });
});

describe("PushNotificationsProvider", () => {
  function mount() {
    return render(
      <MemoryRouter initialEntries={["/start"]}>
        <PushNotificationsProvider />
        <Routes><Route path="*" element={<Where />} /></Routes>
      </MemoryRouter>,
    );
  }

  it("a tap on a plain-path notification navigates there", async () => {
    const view = mount();
    await waitFor(() => expect(h.onOpen).toBeTypeOf("function"));
    h.onOpen!("/applications/abc");
    await waitFor(() => expect(view.getByTestId("where").textContent).toBe("/applications/abc"));
  });

  it("a tap on a bfportal: link navigates to its route", async () => {
    const view = mount();
    await waitFor(() => expect(h.onOpen).toBeTypeOf("function"));
    h.onOpen!("bfportal://crm");
    await waitFor(() => expect(view.getByTestId("where").textContent).toBe("/crm"));
  });

  it("the Dismiss action stays in the background", async () => {
    const view = mount();
    await waitFor(() => expect(h.onOpen).toBeTypeOf("function"));
    h.onOpen!("/applications/abc", "DISMISS");
    await new Promise((r) => setTimeout(r, 0));
    expect(view.getByTestId("where").textContent).toBe("/start");
  });
});
