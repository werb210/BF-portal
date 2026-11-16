// BF_PORTAL_v964_CALL_CONTROLS - the in-portal meeting screen's controls, against a fake Calling SDK.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  type Fn = (...a: any[]) => void;
  class Emitter { private l = new Map<string, Fn[]>(); on(e: string, f: Fn) { this.l.set(e, [...(this.l.get(e) ?? []), f]); } off() {} emit(e: string, ...a: any[]) { (this.l.get(e) ?? []).forEach((f) => f(...a)); } }
  const person = (name: string, id: string, extra: Record<string, unknown> = {}) => Object.assign(new Emitter(), { displayName: name, identifier: { microsoftTeamsUserId: id }, isMuted: false, isSpeaking: false, state: "Connected", videoStreams: [], mute: vi.fn(async () => undefined), ...extra });
  class FakeCall extends Emitter {
    state = "Connected"; isMuted = false; isScreenSharingOn = false; remoteParticipants: any[] = []; callEndReason: any = undefined;
    lobby = Object.assign(new Emitter(), { participants: [] as any[], admit: vi.fn(async () => undefined), reject: vi.fn(async () => undefined), admitAll: vi.fn(async () => undefined) });
    features: Record<string, any> = {
      Recording: Object.assign(new Emitter(), { isRecordingActive: false }),
      Transcription: Object.assign(new Emitter(), { isTranscriptionActive: false }),
      RaiseHand: Object.assign(new Emitter(), { raiseHand: vi.fn(async () => undefined), lowerHand: vi.fn(async () => undefined), getRaisedHands: () => [] as any[] }),
      Reaction: { sendReaction: vi.fn(async () => undefined) },
      Captions: { captions: Object.assign(new Emitter(), { isCaptionsFeatureActive: false, startCaptions: vi.fn(async () => undefined), stopCaptions: vi.fn(async () => undefined) }) },
    };
    feature = (f: { name: string }) => this.features[f.name];
    mute = vi.fn(async () => { this.isMuted = true; }); unmute = vi.fn(async () => { this.isMuted = false; });
    startVideo = vi.fn(async () => undefined); stopVideo = vi.fn(async () => undefined);
    startScreenSharing = vi.fn(async () => { this.isScreenSharingOn = true; }); stopScreenSharing = vi.fn(async () => { this.isScreenSharingOn = false; });
    removeParticipant = vi.fn(async () => undefined); muteAllRemoteParticipants = vi.fn(async () => undefined);
    hangUp = vi.fn(async () => { this.state = "Disconnected"; });
  }
  const devices = { isSpeakerSelectionAvailable: true, selectedMicrophone: { id: "mic-1" }, selectedSpeaker: { id: "spk-1" },
    askDevicePermission: async () => ({ audio: true, video: true }), getCameras: async () => [{ id: "cam-1", name: "Front camera" }, { id: "cam-2", name: "Desk camera" }],
    getMicrophones: async () => [{ id: "mic-1", name: "Built-in mic" }, { id: "mic-2", name: "Headset" }], getSpeakers: async () => [{ id: "spk-1", name: "Speakers" }],
    selectMicrophone: vi.fn(async () => undefined), selectSpeaker: vi.fn(async () => undefined) };
  const state = { call: null as FakeCall | null, switchSource: vi.fn(async () => undefined) };
  return { Emitter, FakeCall, person, devices, state };
});

vi.mock("@azure/communication-common", () => ({ AzureCommunicationTokenCredential: class { constructor(public token: string) {} dispose() {} } }));
vi.mock("@azure/communication-calling", () => {
  const agent = () => ({ join: () => { h.state.call = new h.FakeCall(); return h.state.call; }, dispose: async () => undefined });
  return {
    CallClient: class { async createTeamsCallAgent() { return agent(); } async createCallAgent() { return agent(); } async getDeviceManager() { return h.devices; } async dispose() {} },
    Features: { Recording: { name: "Recording" }, Transcription: { name: "Transcription" }, RaiseHand: { name: "RaiseHand" }, Reaction: { name: "Reaction" }, Captions: { name: "Captions" } },
    LocalVideoStream: class { constructor(public source: unknown) {} switchSource = h.state.switchSource; },
    VideoStreamRenderer: class { async createView() { return { target: document.createElement("div") }; } dispose() {} },
  };
});

import TeamsMeetingCall, { addCaption, clock, participantId } from "../TeamsMeetingCall";

const ticket = { token: "t", acsUserId: "teams:x", displayName: "Alex Tester", joinUrl: "https://teams.microsoft.com/l/meetup-join/19%3ameeting_v964%40thread.v2/0", identity: "teams" as const };

async function open() {
  render(<TeamsMeetingCall ticket={ticket} onEnded={() => undefined} />);
  await waitFor(() => expect(h.state.call).not.toBeNull());
  const call = h.state.call!;
  act(() => { call.emit("stateChanged"); });
  await waitFor(() => expect(screen.getByTestId("meeting-bar")).toBeInTheDocument());
  await waitFor(() => expect(screen.getByTestId("meeting-recording")).toBeInTheDocument());
  return call;
}

beforeEach(() => { h.state.call = null; h.devices.selectMicrophone.mockClear(); h.state.switchSource.mockClear(); });

describe("meeting controls in the portal", () => {
  it("shows who is waiting and lets the organiser admit or decline them", async () => {
    const call = await open();
    const sam = h.person("Sam Example", "id-sam", { state: "InLobby" });
    act(() => { call.lobby.participants = [sam]; call.lobby.emit("lobbyParticipantsUpdated"); });
    expect(screen.getByTestId("meeting-waiting-banner")).toHaveTextContent("Sam Example is waiting to be let in.");
    expect(screen.getByTestId("meeting-people-button")).toHaveTextContent("1 waiting");
    fireEvent.click(screen.getByTestId("meeting-people-button"));
    fireEvent.click(screen.getByRole("button", { name: "Let Sam Example in" }));
    await waitFor(() => expect(call.lobby.admit).toHaveBeenCalledWith({ microsoftTeamsUserId: "id-sam" }));
    fireEvent.click(screen.getByRole("button", { name: "Decline Sam Example" }));
    await waitFor(() => expect(call.lobby.reject).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Let everyone in" }));
    await waitFor(() => expect(call.lobby.admitAll).toHaveBeenCalled());
  });

  it("lists people in the meeting with mute, remove and raised hands", async () => {
    const call = await open();
    const jo = h.person("Jo Sample", "id-jo");
    call.features.RaiseHand.getRaisedHands = () => [{ identifier: { microsoftTeamsUserId: "id-jo" }, order: 1 }];
    act(() => { call.remoteParticipants = [jo]; call.emit("remoteParticipantsUpdated", { added: [jo], removed: [] }); });
    fireEvent.click(screen.getByTestId("meeting-people-button"));
    expect(screen.getByTestId("meeting-person")).toHaveTextContent("Jo Sample (hand up)");
    fireEvent.click(screen.getByRole("button", { name: "Mute Jo Sample" }));
    await waitFor(() => expect(jo.mute).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Remove Jo Sample" }));
    await waitFor(() => expect(call.removeParticipant).toHaveBeenCalledWith({ microsoftTeamsUserId: "id-jo" }));
  });

  it("shares the screen, raises a hand, reacts and shows live captions", async () => {
    const call = await open();
    fireEvent.click(screen.getByRole("button", { name: "Share screen" }));
    await waitFor(() => expect(call.startScreenSharing).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: "Stop sharing" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Raise hand" }));
    await waitFor(() => expect(call.features.RaiseHand.raiseHand).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Send a thumbs up" }));
    await waitFor(() => expect(call.features.Reaction.sendReaction).toHaveBeenCalledWith({ reactionType: "like" }));
    fireEvent.click(screen.getByRole("button", { name: "Captions" }));
    await waitFor(() => expect(call.features.Captions.captions.startCaptions).toHaveBeenCalled());
    act(() => { call.features.Captions.captions.emit("CaptionsReceived", { speaker: { displayName: "Jo Sample" }, captionText: "Good afternoon.", resultType: "Final" }); });
    expect(screen.getByTestId("meeting-captions")).toHaveTextContent("Jo Sample: Good afternoon.");
  });

  it("shows whether the meeting is being recorded and lets devices be changed", async () => {
    const call = await open();
    expect(screen.getByTestId("meeting-recording")).toHaveTextContent("Not recording");
    act(() => { call.features.Recording.isRecordingActive = true; call.features.Recording.emit("isRecordingActiveChanged"); call.features.Transcription.isTranscriptionActive = true; call.features.Transcription.emit("isTranscriptionActiveChanged"); });
    expect(screen.getByTestId("meeting-recording")).toHaveTextContent("Recording and transcribing");
    fireEvent.click(screen.getByRole("button", { name: "Devices" }));
    await waitFor(() => expect((screen.getByTestId("meeting-mic") as HTMLSelectElement).options.length).toBe(2));
    fireEvent.change(screen.getByTestId("meeting-mic"), { target: { value: "mic-2" } });
    await waitFor(() => expect(h.devices.selectMicrophone).toHaveBeenCalledWith({ id: "mic-2", name: "Headset" }));
    fireEvent.change(screen.getByTestId("meeting-cam"), { target: { value: "cam-2" } });
    await waitFor(() => expect(h.state.switchSource).toHaveBeenCalledWith({ id: "cam-2", name: "Desk camera" }));
  });

  it("says so when Teams refuses an action instead of failing", async () => {
    const call = await open();
    call.startScreenSharing.mockRejectedValueOnce(new Error("not allowed"));
    fireEvent.click(screen.getByRole("button", { name: "Share screen" }));
    expect(await screen.findByTestId("meeting-note")).toHaveTextContent("We couldn't share your screen");
  });

  it("small helpers", () => {
    expect(participantId({ communicationUserId: "8:acs:1" })).toBe("8:acs:1");
    expect(participantId(null)).toBe("");
    expect(clock(65)).toBe("1:05");
    expect(clock(3725)).toBe("1:02:05");
    const a = addCaption([], "Jo", "Hel", false, null);
    expect(a).toEqual({ lines: [], partial: { who: "Jo", text: "Hel" } });
    expect(addCaption(a.lines, "Jo", "Hello.", true, a.partial)).toEqual({ lines: [{ who: "Jo", text: "Hello." }], partial: null });
  });
});
