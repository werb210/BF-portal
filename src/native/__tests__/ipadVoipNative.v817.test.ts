// BF_PORTAL_v817_IPAD_VOIP - the iPad app's native config for ringing while closed: VoIP background mode,
// push entitlement, the TwilioVoice Swift package on the App target, and the plugin + engine wired in.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ios = (p: string) => readFileSync("ios/App/" + p, "utf8");
const pbx = ios("App.xcodeproj/project.pbxproj");

describe("iPad VoIP native config", () => {
  it("Info.plist keeps fetch and adds voip + audio background modes, with a microphone reason", () => {
    const plist = ios("App/Info.plist");
    const modes = plist.split("<key>UIBackgroundModes</key>")[1]?.split("</array>")[0] ?? "";
    for (const m of ["fetch", "voip", "audio"]) expect(modes).toContain(`<string>${m}</string>`);
    expect(plist).toContain("<key>NSMicrophoneUsageDescription</key>");
  });

  it("the app entitlements allow push (aps-environment)", () => {
    expect(ios("App/App.entitlements")).toMatch(/<key>aps-environment<\/key>\s*<string>development<\/string>/);
  });

  it("the App target links the TwilioVoice Swift package and compiles the voice files", () => {
    expect(pbx).toContain('repositoryURL = "https://github.com/twilio/twilio-voice-ios";');
    expect(pbx).toMatch(/kind = upToNextMajorVersion;\s*minimumVersion = 6\.\d+\.\d+;/);
    expect(pbx).toMatch(/productName = TwilioVoice;/);
    expect(pbx).toContain("/* TwilioVoice in Frameworks */ = {isa = PBXBuildFile; productRef =");
    expect(pbx).toContain("PortalVoiceEngine.swift in Sources */,");
    expect(pbx).toContain("BorealVoicePlugin.swift in Sources */,");
    // the company bundle id is untouched
    expect(pbx).toMatch(/PRODUCT_BUNDLE_IDENTIFIER = com\.borealfinancial\.portal;/);
  });

  it("PushKit starts at launch and the plugin is registered with the bridge", () => {
    expect(ios("App/AppDelegate.swift")).toContain("PortalVoiceEngine.shared.start()");
    expect(ios("App/BorealBridgeViewController.swift")).toContain("bridge?.registerPluginInstance(BorealVoicePlugin())");
    expect(ios("App/BorealVoicePlugin.swift")).toContain('public let jsName = "BorealVoice"');
  });
});
