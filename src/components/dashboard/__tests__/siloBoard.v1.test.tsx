// BF_PORTAL_SILO_DASHBOARDS_v1 - BI and Keystone boards: saved layouts, standard fallback, and never saving over
// another business's layout.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ layout: null as any, puts: [] as any[] }));
vi.mock("@/api", () => ({
  api: Object.assign(vi.fn(), {
    get: vi.fn(async () => h.layout),
    put: vi.fn(async (_p: string, body: any) => { h.puts.push(body); return { ok: true }; }),
  }),
}));

import SiloBoard, { usableCards, type BoardSection } from "../SiloBoard";

const sections: BoardSection[] = [
  { key: "a", title: "Alpha", size: "full", description: "", render: () => <p>alpha body</p> },
  { key: "b", title: "Beta", size: "half", description: "", render: () => <p>beta body</p> },
  { key: "c", title: "Gamma", size: "half", description: "", standard: false, render: () => <p>gamma body</p> },
];

beforeEach(() => { h.layout = null; h.puts = []; window.localStorage.clear(); });

describe("SiloBoard", () => {
  it("shows the standard sections when nothing is saved", async () => {
    h.layout = { silo: "KS", tabs: [], dashboard: null };
    render(<SiloBoard silo="KS" title="KS" sections={sections} />);
    expect(await screen.findByText("alpha body")).toBeInTheDocument();
    expect(screen.getByText("beta body")).toBeInTheDocument();
    expect(screen.queryByText("gamma body")).not.toBeInTheDocument();
  });

  it("uses the saved order and adds a removed section back, saving for its own business", async () => {
    h.layout = { silo: "BI", tabs: [{ name: "Mine" }], dashboard: { cards: [{ id: "b", report: "b", size: "full" }] } };
    render(<SiloBoard silo="BI" title="BI" sections={sections} />);
    expect(await screen.findByText("beta body")).toBeInTheDocument();
    expect(screen.queryByText("alpha body")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("board-add"));
    fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
    await waitFor(() => expect(h.puts).toHaveLength(1));
    expect(h.puts[0]).toEqual({ silo: "BI", tabs: [{ name: "Mine" }], dashboard: { cards: [{ id: "b", report: "b", size: "full" }, { id: "c", report: "c", size: "half" }] } });
  });

  it("never saves to the server when it answers for another business", async () => {
    h.layout = { silo: "BF", tabs: [{ name: "BF tab" }], dashboard: { cards: [{ id: "dash_kpis", report: "dash_kpis", size: "full" }] } };
    render(<SiloBoard silo="KS" title="KS" sections={sections} />);
    expect(await screen.findByText("alpha body")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("board-add"));
    fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
    await waitFor(() => expect(window.localStorage.getItem("bf.dash.KS.v1")).toContain("\"c\""));
    expect(h.puts).toHaveLength(0);
  });

  it("drops unknown and repeated cards", () => {
    expect(usableCards([{ id: "x", report: "zz", size: "full" }, { id: "b", report: "b", size: "half" }, { id: "b2", report: "b", size: "full" }], sections).map((c) => c.id)).toEqual(["b"]);
  });
});
