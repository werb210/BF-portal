// BF_PORTAL_v817_IPAD_VOIP
// Incoming calls ring the iPad even when the staff portal app is closed.
//
// PushKit (VoIP push) -> TwilioVoiceSDK.handleNotification -> CallKit. Modelled on the
// iPhone dialer (boreal-dialer-ios Sources/Voice: VoiceEngine, TwilioVoiceManager,
// VoiceManager, CallKitReporter, PushManager):
//   - every VoIP push reports a call to CallKit synchronously inside the PushKit callback,
//     never after a network call (iOS kills the app, then stops delivering VoIP pushes);
//     a push that cannot ring reports a placeholder call and ends it at once;
//   - CallKit owns the audio session: Twilio's DefaultAudioDevice is enabled only in
//     provider(_:didActivate:) and disabled again in didDeactivate;
//   - answer = CXAnswerCallAction -> callInvite.accept, decline = reject, end = disconnect.
// The WebView is not needed for any of this. The Twilio access token is only needed to
// register the VoIP device token, so the last one is kept in the Keychain: a cold launch
// by PushKit (or a rotated VoIP token) can re-register without the web app.
//
// No Capacitor import here (TwilioVoice's `Call` is used unqualified); the JS bridge is
// BorealVoicePlugin.swift. Everything runs on the main queue: the push registry, CallKit
// delegate (queue nil) and Twilio delegates (delegateQueue nil) all call back on main.
import Foundation
import UIKit
import AVFoundation
import CallKit
import PushKit
import TwilioVoice

// BF_PORTAL_v817_IPAD_VOIP - receives engine events for the web app (BorealVoicePlugin).
protocol PortalVoiceListener: AnyObject {
    func portalVoiceEvent(_ event: String, data: [String: Any])
}

// BF_PORTAL_v817_IPAD_VOIP - the last Twilio access token, this app only, readable after
// first unlock so a PushKit launch on a locked iPad can still use it, never synced off device.
enum PortalVoiceKeychain {
    static let service = "com.borealfinancial.portal.voice"
    static let account = "twilio-access-token"

    private static func query() -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: account]
    }

    static func save(_ token: String) {
        if load() == token { return }
        SecItemDelete(query() as CFDictionary)
        var add = query()
        add[kSecValueData as String] = Data(token.utf8)
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(add as CFDictionary, nil)
    }

    static func load() -> String? {
        var q = query()
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func clear() {
        SecItemDelete(query() as CFDictionary)
    }

    /// The token's `exp`, or nil when it cannot be read.
    static func expiry(of token: String) -> Date? {
        let parts = token.split(separator: ".")
        guard parts.count > 1 else { return nil }
        var b64 = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while b64.count % 4 != 0 { b64.append("=") }
        guard let data = Data(base64Encoded: b64),
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let exp = json["exp"] as? NSNumber else { return nil }
        return Date(timeIntervalSince1970: exp.doubleValue)
    }

    /// The stored token if it has at least a minute left.
    static func loadUsable() -> String? {
        guard let token = load() else { return nil }
        if let exp = expiry(of: token), exp.timeIntervalSinceNow < 60 { return nil }
        return token
    }
}

// BF_PORTAL_v817_IPAD_VOIP - one place for the microphone permission (same as the dialer's
// MicrophonePermission). AVAudioApplication replaces the AVAudioSession API from iOS 17.
enum PortalMicrophone {
    static func requestIfNeeded() {
        if #available(iOS 17.0, *) {
            if AVAudioApplication.shared.recordPermission == .undetermined {
                AVAudioApplication.requestRecordPermission { _ in }
            }
        } else {
            if AVAudioSession.sharedInstance().recordPermission == .undetermined {
                AVAudioSession.sharedInstance().requestRecordPermission { _ in }
            }
        }
    }
}

final class PortalVoiceEngine: NSObject {

    static let shared = PortalVoiceEngine()

    weak var listener: PortalVoiceListener?

    private var pushRegistry: PKPushRegistry?
    private var provider: CXProvider!
    private let callController = CXCallController()
    // Installed once; off until CallKit activates the audio session.
    private let audioDevice = DefaultAudioDevice()

    // Registration
    private var deviceToken: Data?
    private var accessToken: String?
    private var registeredToken: String?
    private var registeredDeviceToken: Data?
    private var registering = false
    private var reregisterAfterCurrent = false
    private var triedNativeRefresh = false
    private(set) var isRegistered = false
    private var lastError: String?
    private var registerWaiters: [(Bool, String?) -> Void] = []

    // Calls (one at a time, like the dialer: maximumCallGroups 1)
    private var pendingInvites: [UUID: CallInvite] = [:]
    private var activeCall: Call?
    private var activeUUID: UUID?
    private var callInfo: [UUID: [String: Any]] = [:]
    private var endedLocally = Set<UUID>()
    private var isConnected = false
    private var isMuted = false
    private var isSpeaker = false

    // The PushKit delivery being handled right now.
    private var pushCompletion: (() -> Void)?
    private var pushClaimed = true

    private override init() {
        super.init()
        TwilioVoiceSDK.audioDevice = audioDevice
        audioDevice.isEnabled = false

        let config = CXProviderConfiguration()
        config.supportsVideo = false
        config.maximumCallGroups = 1
        config.maximumCallsPerCallGroup = 1
        config.includesCallsInRecents = true
        config.supportedHandleTypes = [.phoneNumber, .generic]
        // Optional: a monochrome "CallKitIcon" image set in Assets.xcassets.
        if let icon = UIImage(named: "CallKitIcon"), let png = icon.pngData() {
            config.iconTemplateImageData = png
        }
        provider = CXProvider(configuration: config)
        provider.setDelegate(self, queue: nil)
    }

    /// AppDelegate didFinishLaunching. PushKit must be set up before launch finishes so a
    /// VoIP push that launched the app is delivered.
    func start() {
        guard pushRegistry == nil else { return }
        let registry = PKPushRegistry(queue: DispatchQueue.main)
        registry.delegate = self
        registry.desiredPushTypes = [.voIP]
        pushRegistry = registry
    }

    // MARK: - Registration (called by BorealVoicePlugin)

    func register(accessToken token: String, completion: @escaping (Bool, String?) -> Void) {
        start()
        accessToken = token
        triedNativeRefresh = false
        PortalVoiceKeychain.save(token)
        PortalMicrophone.requestIfNeeded()
        registerWaiters.append(completion)
        if deviceToken == nil {
            // PushKit has not handed over the VoIP token yet. Answer the web app either way.
            DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
                guard let self = self, self.deviceToken == nil else { return }
                self.flushWaiters(ok: false, error: "no_voip_device_token")
            }
            return
        }
        registerIfPossible(force: registeredToken != token)
    }

    func unregister(completion: @escaping () -> Void) {
        let token = registeredToken ?? accessToken ?? PortalVoiceKeychain.load()
        accessToken = nil
        registeredToken = nil
        registeredDeviceToken = nil
        isRegistered = false
        PortalVoiceKeychain.clear()
        flushWaiters(ok: false, error: "unregistered")
        emit("registrationChanged", ["registered": false])
        guard let t = token, let device = deviceToken else {
            completion()
            return
        }
        TwilioVoiceSDK.unregister(accessToken: t, deviceToken: device) { _ in
            DispatchQueue.main.async { completion() }
        }
    }

    private func registerIfPossible(force: Bool) {
        guard let device = deviceToken else { return }
        guard let token = accessToken ?? PortalVoiceKeychain.loadUsable() else {
            refreshAccessTokenNatively()
            return
        }
        if !force, isRegistered, registeredToken == token, registeredDeviceToken == device {
            flushWaiters(ok: true, error: nil)
            return
        }
        if registering {
            reregisterAfterCurrent = true
            return
        }
        registering = true
        TwilioVoiceSDK.register(accessToken: token, deviceToken: device) { [weak self] error in
            let failure = error?.localizedDescription
            DispatchQueue.main.async {
                self?.finishRegistration(token: token, device: device, failure: failure)
            }
        }
    }

    private func finishRegistration(token: String, device: Data, failure: String?) {
        registering = false
        if let failure = failure {
            isRegistered = false
            lastError = failure
            NSLog("[BorealVoice] Twilio VoIP registration failed: %@", failure)
        } else {
            isRegistered = true
            registeredToken = token
            registeredDeviceToken = device
            lastError = nil
        }
        flushWaiters(ok: failure == nil, error: failure)
        emit("registrationChanged", ["registered": isRegistered])
        if reregisterAfterCurrent {
            reregisterAfterCurrent = false
            registerIfPossible(force: true)
        }
    }

    private func flushWaiters(ok: Bool, error: String?) {
        let waiters = registerWaiters
        registerWaiters.removeAll()
        for waiter in waiters { waiter(ok, error) }
    }

    /// Cold launch with no usable token in the Keychain: ask BF-Server for one with the
    /// staff session the widget refresh already keeps in this app's Keychain
    /// (WidgetRefreshSession, BF_PORTAL_WIDGET_SELF_REFRESH_v384). Once per launch.
    private func refreshAccessTokenNatively() {
        guard !triedNativeRefresh else { return }
        triedNativeRefresh = true
        guard let staffToken = WidgetRefreshSession.token(),
              let base = WidgetRefreshSession.apiBase,
              let url = URL(string: base + "/api/voice/token") else { return }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 20)
        request.httpMethod = "POST"
        request.setValue("Bearer \(staffToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["app": "portal-ios"])
        URLSession.shared.dataTask(with: request) { data, response, _ in
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            var fresh: String?
            if status == 200, let data = data,
               let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
                fresh = (json["token"] as? String) ?? ((json["data"] as? [String: Any])?["token"] as? String)
            }
            DispatchQueue.main.async { [weak self] in
                guard let self = self, let token = fresh, !token.isEmpty, self.accessToken == nil else { return }
                PortalVoiceKeychain.save(token)
                self.accessToken = token
                self.registerIfPossible(force: true)
            }
        }.resume()
    }

    // MARK: - Calls (called by BorealVoicePlugin)

    private var currentUUID: UUID? {
        activeUUID ?? pendingInvites.keys.first
    }

    func hangUp() {
        guard let uuid = currentUUID else { return }
        let transaction = CXTransaction(action: CXEndCallAction(call: uuid))
        callController.request(transaction) { [weak self] error in
            guard error != nil else { return }
            DispatchQueue.main.async {
                // CallKit no longer knows the call: end it here.
                self?.forceEnd(uuid: uuid)
            }
        }
    }

    func setMuted(_ muted: Bool) {
        guard let uuid = activeUUID else { return }
        // Through CallKit so its in-call screen stays in step.
        let transaction = CXTransaction(action: CXSetMutedCallAction(call: uuid, muted: muted))
        callController.request(transaction) { [weak self] error in
            guard error != nil else { return }
            DispatchQueue.main.async { self?.applyMuted(muted) }
        }
    }

    func setSpeaker(_ on: Bool) -> Bool {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.overrideOutputAudioPort(on ? .speaker : .none)
            isSpeaker = on
        } catch {
            NSLog("[BorealVoice] speaker override failed: %@", error.localizedDescription)
        }
        return isSpeaker
    }

    func state() -> [String: Any] {
        var out: [String: Any] = [
            "registered": isRegistered,
            "hasDeviceToken": deviceToken != nil,
            "muted": isMuted,
            "speaker": isSpeaker
        ]
        if let err = lastError { out["lastError"] = err }
        if let uuid = currentUUID {
            var call = callInfo[uuid] ?? ["uuid": uuid.uuidString]
            call["phase"] = activeUUID == uuid ? (isConnected ? "connected" : "connecting") : "ringing"
            out["call"] = call
        }
        return out
    }

    // MARK: - Helpers

    private func emit(_ event: String, _ data: [String: Any]) {
        listener?.portalVoiceEvent(event, data: data)
        // BF_PORTAL_v817_IPAD_VOIP - one summary event for the web app: callStateChanged {state, from, uuid}.
        let state: String
        switch event {
        case "callIncoming": state = "ringing"
        case "callAnswered": state = "connecting"
        case "callConnected": state = "connected"
        case "callEnded": state = "ended"
        default: return
        }
        var summary: [String: Any] = [
            "state": state,
            "from": (data["from"] as? String) ?? "",
            "uuid": (data["uuid"] as? String) ?? ""
        ]
        if let name = data["callerName"] as? String { summary["callerName"] = name }
        if let reason = data["reason"] as? String { summary["reason"] = reason }
        listener?.portalVoiceEvent("callStateChanged", data: summary)
    }

    private static func displayHandle(_ from: String) -> String {
        var s = from
        if s.hasPrefix("client:") { s = String(s.dropFirst("client:".count)) }
        return s.isEmpty ? "Unknown caller" : s
    }

    private static func looksLikePhone(_ s: String) -> Bool {
        s.filter { $0.isNumber }.count >= 7 && !s.hasPrefix("client:")
    }

    private func configureAudioSessionForCall() {
        // Category and mode only. CallKit activates (and deactivates) the session.
        do {
            try AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth])
        } catch {
            NSLog("[BorealVoice] audio session config failed: %@", error.localizedDescription)
        }
    }

    private func applyMuted(_ muted: Bool) {
        activeCall?.isMuted = muted
        isMuted = activeCall?.isMuted ?? false
        emit("callMuted", ["muted": isMuted])
    }

    /// The current PushKit completion, taken by the first report this push produces.
    private func claimPush() -> (() -> Void)? {
        guard !pushClaimed else { return nil }
        pushClaimed = true
        let completion = pushCompletion
        pushCompletion = nil
        return completion
    }

    /// A push that cannot ring: report a call (iOS requires it) and end it at once.
    /// A fresh UUID so a duplicate never ends the call that is ringing.
    private func reportPlaceholder(handle: String?, reason: CXCallEndedReason, completion: (() -> Void)?) {
        let uuid = UUID()
        let update = CXCallUpdate()
        let value = (handle?.isEmpty == false ? handle : nil) ?? "Boreal"
        update.remoteHandle = CXHandle(type: .generic, value: value)
        update.localizedCallerName = value
        update.hasVideo = false
        provider.reportNewIncomingCall(with: uuid, update: update) { [weak self] _ in
            DispatchQueue.main.async {
                self?.provider.reportCall(with: uuid, endedAt: Date(), reason: reason)
                completion?()
            }
        }
    }

    private func finishCall(uuid: UUID, reason: String) {
        let info = callInfo[uuid] ?? ["uuid": uuid.uuidString]
        callInfo[uuid] = nil
        pendingInvites[uuid] = nil
        endedLocally.remove(uuid)
        if activeUUID == uuid {
            activeCall = nil
            activeUUID = nil
            isConnected = false
            isMuted = false
            isSpeaker = false
        }
        var data = info
        data["reason"] = reason
        emit("callEnded", data)
        // A token refreshed mid-call is registered once the line is free.
        if reregisterAfterCurrent && !registering {
            reregisterAfterCurrent = false
            registerIfPossible(force: true)
        }
    }

    private func forceEnd(uuid: UUID) {
        if let invite = pendingInvites[uuid] { invite.reject() }
        if activeUUID == uuid { activeCall?.disconnect() }
        provider.reportCall(with: uuid, endedAt: Date(), reason: .remoteEnded)
        finishCall(uuid: uuid, reason: "ended")
    }

    /// Puts the CRM contact's name on the ringing CallKit screen. After the report, never before.
    private func resolveCallerName(uuid: UUID, from: String) {
        guard Self.looksLikePhone(from),
              let staffToken = WidgetRefreshSession.token(),
              let base = WidgetRefreshSession.apiBase,
              let url = URL(string: base + "/api/voice/resolve-caller") else { return }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8)
        request.httpMethod = "POST"
        request.setValue("Bearer \(staffToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["phone": from])
        URLSession.shared.dataTask(with: request) { data, response, _ in
            guard (response as? HTTPURLResponse)?.statusCode == 200, let data = data,
                  let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return }
            let body = (json["data"] as? [String: Any]) ?? json
            guard (body["matched"] as? Bool) == true, let name = body["name"] as? String, !name.isEmpty else { return }
            DispatchQueue.main.async { [weak self] in
                guard let self = self, self.callInfo[uuid] != nil else { return }
                self.callInfo[uuid]?["callerName"] = name
                let update = CXCallUpdate()
                update.localizedCallerName = name
                self.provider.reportCall(with: uuid, updated: update)
            }
        }.resume()
    }
}

// MARK: - PushKit

extension PortalVoiceEngine: PKPushRegistryDelegate {

    func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        guard type == .voIP else { return }
        // Handed over on every launch and whenever it rotates: register each time so a
        // registration Twilio expired or dropped is renewed.
        deviceToken = pushCredentials.token
        registerIfPossible(force: true)
    }

    func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
        guard type == .voIP else { return }
        if let old = deviceToken, let token = registeredToken ?? accessToken {
            TwilioVoiceSDK.unregister(accessToken: token, deviceToken: old) { _ in }
        }
        deviceToken = nil
        registeredDeviceToken = nil
        isRegistered = false
        emit("registrationChanged", ["registered": false])
    }

    func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
        guard type == .voIP else {
            completion()
            return
        }
        // Report to CallKit before this returns. The registry runs on .main and Twilio calls
        // callInviteReceived synchronously on this queue (delegateQueue nil), so the real
        // report happens inside handleNotification; nothing here waits on the network.
        pushCompletion = completion
        pushClaimed = false
        let handled = TwilioVoiceSDK.handleNotification(payload.dictionaryPayload, delegate: self, delegateQueue: nil)
        if let unclaimed = claimPush() {
            // Not a Twilio invite (or no invite came out of it): iOS still requires a call.
            reportPlaceholder(handle: nil, reason: handled ? .unanswered : .failed, completion: unclaimed)
        }
    }
}

// MARK: - Twilio invites

extension PortalVoiceEngine: NotificationDelegate {

    func callInviteReceived(callInvite: CallInvite) {
        let completion = claimPush()
        let uuid = callInvite.uuid
        let from = callInvite.from ?? ""
        let display = Self.displayHandle(from)

        // A retried delivery of the invite already ringing: report and end a placeholder,
        // do not reject (that would reject the real call).
        if pendingInvites.values.contains(where: { $0.callSid == callInvite.callSid }) || activeCall?.sid == callInvite.callSid {
            reportPlaceholder(handle: display, reason: .unanswered, completion: completion)
            return
        }
        // Busy (one call at a time): reject this invite, still report it to CallKit.
        if activeCall != nil || !pendingInvites.isEmpty {
            callInvite.reject()
            reportPlaceholder(handle: display, reason: .unanswered, completion: completion)
            return
        }

        audioDevice.isEnabled = false
        pendingInvites[uuid] = callInvite
        let params = callInvite.customParameters ?? [:]
        let callerName = params["callerName"] ?? params["CallerName"] ?? params["fromDisplay"]
        var info: [String: Any] = ["uuid": uuid.uuidString, "callSid": callInvite.callSid, "from": from]
        if let name = callerName, !name.isEmpty { info["callerName"] = name }
        callInfo[uuid] = info

        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: Self.looksLikePhone(from) ? .phoneNumber : .generic, value: display)
        update.localizedCallerName = (callerName?.isEmpty == false ? callerName : nil) ?? display
        update.hasVideo = false
        update.supportsHolding = true
        update.supportsGrouping = false
        update.supportsUngrouping = false
        update.supportsDTMF = true

        provider.reportNewIncomingCall(with: uuid, update: update) { [weak self] error in
            let failed = error != nil
            DispatchQueue.main.async {
                guard let self = self else {
                    completion?()
                    return
                }
                if failed {
                    // Do Not Disturb / blocked: nothing is ringing, so the invite cannot stay pending.
                    if let invite = self.pendingInvites.removeValue(forKey: uuid) { invite.reject() }
                    self.callInfo[uuid] = nil
                } else {
                    self.emit("callIncoming", self.callInfo[uuid] ?? info)
                    self.resolveCallerName(uuid: uuid, from: from)
                }
                completion?()
            }
        }
    }

    // The caller rang off before anyone answered.
    func cancelledCallInviteReceived(cancelledCallInvite: CancelledCallInvite, error: Error) {
        guard let entry = pendingInvites.first(where: { $0.value.callSid == cancelledCallInvite.callSid }) else { return }
        let uuid = entry.key
        pendingInvites[uuid] = nil
        provider.reportCall(with: uuid, endedAt: Date(), reason: .unanswered)
        finishCall(uuid: uuid, reason: "missed")
    }
}

// MARK: - Twilio call

extension PortalVoiceEngine: CallDelegate {

    func callDidConnect(call: Call) {
        guard let uuid = activeUUID ?? call.uuid else { return }
        isConnected = true
        emit("callConnected", callInfo[uuid] ?? ["uuid": uuid.uuidString, "callSid": call.sid])
    }

    func callDidFailToConnect(call: Call, error: Error) {
        guard let uuid = activeUUID ?? call.uuid else { return }
        if !endedLocally.contains(uuid) {
            provider.reportCall(with: uuid, endedAt: Date(), reason: .failed)
        }
        finishCall(uuid: uuid, reason: "failed")
    }

    func callDidDisconnect(call: Call, error: Error?) {
        guard let uuid = activeUUID ?? call.uuid else { return }
        // A local hang-up already ended the CallKit call through CXEndCallAction.
        if !endedLocally.contains(uuid) {
            provider.reportCall(with: uuid, endedAt: Date(), reason: error == nil ? .remoteEnded : .failed)
        }
        finishCall(uuid: uuid, reason: error == nil ? "ended" : "failed")
    }
}

// MARK: - CallKit

extension PortalVoiceEngine: CXProviderDelegate {

    func providerDidReset(_ provider: CXProvider) {
        audioDevice.isEnabled = false
        for invite in pendingInvites.values { invite.reject() }
        activeCall?.disconnect()
        for uuid in Array(callInfo.keys) { finishCall(uuid: uuid, reason: "ended") }
        pendingInvites.removeAll()
        activeCall = nil
        activeUUID = nil
        isConnected = false
    }

    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        guard let invite = pendingInvites.removeValue(forKey: action.callUUID) else {
            action.fail()
            return
        }
        // Category only; Twilio audio starts when CallKit activates the session.
        audioDevice.isEnabled = false
        configureAudioSessionForCall()
        activeUUID = action.callUUID
        isConnected = false
        // BF_PORTAL_v817_IPAD_VOIP - the Twilio Call carries the CallKit UUID, so its delegate callbacks find the CallKit call.
        let callUUID = action.callUUID
        let options = AcceptOptions(callInvite: invite) { builder in
            builder.uuid = callUUID
        }
        activeCall = invite.accept(options: options, delegate: self)
        emit("callAnswered", callInfo[callUUID] ?? ["uuid": callUUID.uuidString])
        action.fulfill()
    }

    func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        let uuid = action.callUUID
        if let invite = pendingInvites.removeValue(forKey: uuid) {
            // Declined while ringing.
            invite.reject()
            finishCall(uuid: uuid, reason: "declined")
        } else if activeUUID == uuid, let call = activeCall {
            endedLocally.insert(uuid)
            call.disconnect()
            // finishCall runs from callDidDisconnect.
        } else if callInfo[uuid] != nil {
            finishCall(uuid: uuid, reason: "ended")
        }
        action.fulfill()
    }

    func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
        guard activeUUID == action.callUUID, activeCall != nil else {
            action.fail()
            return
        }
        applyMuted(action.isMuted)
        action.fulfill()
    }

    func provider(_ provider: CXProvider, perform action: CXSetHeldCallAction) {
        guard activeUUID == action.callUUID, let call = activeCall else {
            action.fail()
            return
        }
        call.isOnHold = action.isOnHold
        action.fulfill()
    }

    func provider(_ provider: CXProvider, perform action: CXPlayDTMFCallAction) {
        guard activeUUID == action.callUUID, let call = activeCall, !action.digits.isEmpty else {
            action.fail()
            return
        }
        call.sendDigits(action.digits)
        action.fulfill()
    }

    // CallKit hands over the audio session: only now may Twilio start audio.
    func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
        audioDevice.isEnabled = true
    }

    // CallKit took the audio session back.
    func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
        audioDevice.isEnabled = false
    }

    func provider(_ provider: CXProvider, timedOutPerforming action: CXAction) {
        if let answer = action as? CXAnswerCallAction {
            forceEnd(uuid: answer.callUUID)
        }
    }
}
