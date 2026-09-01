import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/app", () => ({ App: { addListener: vi.fn() } }));
vi.mock("@/native/widgetSnapshot", () => ({ publishWidgetSnapshot: vi.fn() }));
vi.mock("@/native/widgetBridge", () => ({
  mirrorSiloToWidget: vi.fn(), WidgetBridgePlugin: {}, WIDGET_GROUP: "group.com.boreal.portal", isNativeIOS: () => false,
}));
vi.mock("@/context/SiloContext", () => ({ useSilo: vi.fn() }));

import { widgetRoute } from "../WidgetSnapshotProvider";

describe("widget command centre deep links", () => {
  const widgetSource = () => readFileSync(join(process.cwd(), "ios", "App", "BorealWidget", "SummaryWidget.swift"), "utf8");

  it.each([
    ["bfportal://dashboard?silo=BF", "/portal"],
    ["bfportal://pipeline?silo=BI", "/pipeline"],
    ["bfportal://tasks?silo=BF&view=overdue", "/tasks?view=overdue"],
    ["bfportal://messages?silo=BF&filter=unread", "/communications?tab=inbox&filter=unread"],
    ["bfportal://crm?silo=SLF", "/crm"],
    ["bfportal://commission?silo=BI", "/bi/commissions"],
    ["bfportal://commission?silo=BF", "/portal?focus=commission"],
  ])("routes %s", (url, path) => expect(widgetRoute(url)).toMatchObject({ path }));

  it("carries the validated silo and safely rejects malformed URLs", () => {
    expect(widgetRoute("bfportal://pipeline?silo=BI")).toEqual({ silo: "BI", path: "/pipeline" });
    expect(widgetRoute("not a url")).toBeNull();
  });

  it("keeps WidgetKit display-only and contains real link controls", () => {
    const root = join(process.cwd(), "ios", "App", "BorealWidget");
    const source = ["SummaryWidget.swift", "WidgetSummary.swift", "SummaryProvider.swift"].map((file) => readFileSync(join(root, file), "utf8")).join("\n");
    expect(source).toContain("Link(destination:");
    expect(source).toContain(".widgetURL");
    for (const destination of ["pipeline", "tasks", "messages", "commission", "crm"]) expect(source).toContain(`bfportal://${destination}`);
    expect(source).not.toContain("Open the portal to sign in");
    for (const forbidden of ["Authorization", "Bearer", "widget_auth_token", "URLSession"]) expect(source).not.toContain(forbidden);
  });

  it("keeps the large command centre height-safe without dropping required content", () => {
    const source = widgetSource();
    const largeSummary = source.slice(source.indexOf("struct LargeSummary"), source.indexOf("struct NextRow"));

    expect(largeSummary).toContain("entry.configuration.metrics.prefix(4)");
    expect(largeSummary).toContain("attentionItems.prefix(2)");
    expect(largeSummary).toContain("private var nextItem: NextItem?");
    expect(largeSummary).toContain("if let nextItem");
    expect(largeSummary).not.toContain("if let task = entry.summary.nextTask");
    expect(largeSummary).not.toContain("if let meeting = entry.summary.nextMeeting");
    for (const action of ["Pipeline", "CRM", "Tasks", "Inbox"]) expect(largeSummary).toContain(`Quick("${action}"`);
  });

  it("retains a one-line linked command-centre header and required deep links", () => {
    const source = widgetSource();
    const header = source.slice(source.indexOf("struct CommandCentreHeader"), source.indexOf("struct SmallHeader"));

    expect(header).toContain('Link(destination: deepLink("dashboard", entry.silo))');
    expect(header).toContain("HStack(spacing:");
    expect(header).toContain("lineLimit(1)");
    expect(header).not.toContain("VStack");
    for (const destination of ["pipeline", "tasks", "messages", "crm"]) expect(source).toContain(`bfportal://${destination}`);
  });
});
