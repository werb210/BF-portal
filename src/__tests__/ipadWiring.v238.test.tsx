// BF_PORTAL_IPAD_WIRING_v238
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ContextType } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
// The Swift bridge cannot run under Vitest; its plugin registrations are read as data.
import bridgeSwift from "../../ios/App/App/BorealBridgeViewController.swift?raw";
import { COMMAND_SHORTCUTS, resolveCommandShortcut, useCommandShortcuts } from "@/hooks/useCommandShortcuts";
import MayaCommandBar from "@/components/maya/MayaCommandBar";
import ShortcutHelp from "@/components/ShortcutHelp";
import DocumentsTab from "@/pages/applications/tabs/DocumentsTab";
import App from "../App";
import { AuthContext, AuthProvider } from "../auth/AuthContext";

const key = (k: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }> = {}) =>
  ({ key: k, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...mods });

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("iPad plugin registration", () => {
  const registered = Array.from(bridgeSwift.matchAll(/registerPluginInstance\((\w+)\(\)\)/g), (m) => m[1]);
  it("registers IPadWorkstationPlugin with the bridge", () => {
    expect(registered).toContain("IPadWorkstationPlugin");
  });
  it("still registers the widget bridge", () => {
    expect(registered).toContain("WidgetBridgePlugin");
  });
});

describe("Cmd shortcuts", () => {
  it("Cmd K focuses Maya anywhere", () => {
    expect(resolveCommandShortcut(key("k", { metaKey: true }), "/pipeline")).toEqual({ type: "focus-maya" });
    expect(resolveCommandShortcut(key("K", { ctrlKey: true }), "/crm/contacts")).toEqual({ type: "focus-maya" });
  });
  it("Cmd 1-4 switch application tabs on an application", () => {
    const at = "/applications/abc-123/notes";
    expect(resolveCommandShortcut(key("1", { metaKey: true }), at)).toEqual({ type: "navigate", to: "/applications/abc-123/application" });
    expect(resolveCommandShortcut(key("2", { metaKey: true }), at)).toEqual({ type: "navigate", to: "/applications/abc-123/banking-analysis" });
    expect(resolveCommandShortcut(key("3", { metaKey: true }), at)).toEqual({ type: "navigate", to: "/applications/abc-123/financials" });
    expect(resolveCommandShortcut(key("4", { metaKey: true }), at)).toEqual({ type: "navigate", to: "/applications/abc-123/documents" });
  });
  it("does nothing off an application, without a modifier, or with extra modifiers", () => {
    expect(resolveCommandShortcut(key("1", { metaKey: true }), "/pipeline")).toBeNull();
    expect(resolveCommandShortcut(key("k"), "/pipeline")).toBeNull();
    expect(resolveCommandShortcut(key("k", { metaKey: true, shiftKey: true }), "/pipeline")).toBeNull();
    expect(resolveCommandShortcut(key("5", { metaKey: true }), "/applications/x")).toBeNull();
  });

  it("Cmd K focuses the Maya command bar's input, Cmd 2 switches the application tab", () => {
    function Harness() {
      useCommandShortcuts();
      const loc = useLocation();
      return <><div data-testid="at">{loc.pathname}</div><MayaCommandBar /></>;
    }
    render(<MemoryRouter initialEntries={["/applications/abc-123/notes"]}><Harness /></MemoryRouter>);
    const input = document.querySelector<HTMLTextAreaElement>("[data-maya-command]");
    expect(input).not.toBeNull();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(window, { key: "2", metaKey: true });
    expect(screen.getByTestId("at")).toHaveTextContent("/applications/abc-123/banking-analysis");
  });

  it("is listed in the help overlay", () => {
    expect(COMMAND_SHORTCUTS.map((s) => s.keys)).toEqual(["Cmd K", "Cmd 1", "Cmd 2", "Cmd 3", "Cmd 4"]);
    render(<ShortcutHelp open onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    for (const s of COMMAND_SHORTCUTS) {
      expect(dialog).toHaveTextContent(s.keys);
      expect(dialog).toHaveTextContent(s.label);
    }
  });

  it("is mounted by the App: Cmd K from anywhere focuses the Maya input", async () => {
    render(<MemoryRouter initialEntries={["/login"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    const maya = document.createElement("textarea");
    maya.setAttribute("data-maya-command", "");
    document.body.appendChild(maya);
    await waitFor(() => {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
      expect(document.activeElement).toBe(maya);
    });
  });
});

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const JWT = `${b64({ alg: "HS256" })}.${b64({ sub: "u1", role: "Staff", exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;

describe("drop files onto application documents", () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  beforeEach(() => {
    calls.length = 0;
    localStorage.setItem("auth_token", JWT);
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      const body = String(url).includes("/duplicates") ? [] : String(url).includes("/upload") ? { ok: true } : { documents: [] };
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const drop = (files: File[]) =>
    fireEvent.drop(screen.getByTestId("documents-drop-target"), { dataTransfer: { files, types: ["Files"] } });
  const renderTab = async () => {
    // A signed-in staff member, without AuthProvider's own session checks.
    const auth = { user: { role: "Staff" } } as unknown as NonNullable<ContextType<typeof AuthContext>>;
    render(<AuthContext.Provider value={auth}><DocumentsTab applicationId="app-1" /></AuthContext.Provider>);
    await screen.findByTestId("documents-drop-target");
  };

  it("accepts drops on the tab and stages them in the upload dialog, then uploads them", async () => {
    await renderTab();
    drop([new File(["%PDF"], "jan.pdf", { type: "application/pdf" }), new File(["x"], "virus.exe")]);
    expect(await screen.findByTestId("dropped-files")).toHaveTextContent("1 dropped file: jan.pdf");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Upload" })); });
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/api/documents/upload"))).toBe(true));
    const upload = calls.find((c) => c.url.endsWith("/api/documents/upload"))!;
    const form = upload.init?.body as FormData;
    expect((form.get("file") as File).name).toBe("jan.pdf");
    expect(form.get("applicationId")).toBe("app-1");
  });

  it("clears staged files when the dialog closes or the upload finishes", async () => {
    await renderTab();
    // Finished upload: the dialog closes and reopening it shows no staged files.
    drop([new File(["%PDF"], "jan.pdf")]);
    await screen.findByTestId("dropped-files");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Upload" })); });
    await screen.findByTestId("upload-notice");
    fireEvent.click(screen.getByTestId("staff-upload-document"));
    expect(screen.queryByTestId("dropped-files")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Cancel.
    drop([new File(["%PDF"], "feb.pdf")]);
    await screen.findByTestId("dropped-files");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByTestId("staff-upload-document"));
    expect(screen.queryByTestId("dropped-files")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Clicking the backdrop.
    drop([new File(["%PDF"], "mar.pdf")]);
    const staged = await screen.findByTestId("dropped-files");
    const backdrop = staged.parentElement!.parentElement!;
    fireEvent.click(backdrop);
    fireEvent.click(screen.getByTestId("staff-upload-document"));
    expect(screen.queryByTestId("dropped-files")).toBeNull();
  });
});
