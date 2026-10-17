// BF_PORTAL_v817_IPAD_VOIP
// The web app's handle on PortalVoiceEngine (src/native/portalVoip.ts, jsName "BorealVoice").
// Registered in BorealBridgeViewController.capacitorDidLoad like the other in-app plugins.
// Incoming calls never depend on this plugin or the WebView: PortalVoiceEngine is started
// from AppDelegate and rings through CallKit on its own.
import Foundation
import Capacitor

@objc(BorealVoicePlugin)
public class BorealVoicePlugin: CAPPlugin, CAPBridgedPlugin, PortalVoiceListener {
    public let identifier = "BorealVoicePlugin"
    public let jsName = "BorealVoice"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "register", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unregister", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "mute", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speaker", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hangup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {
        PortalVoiceEngine.shared.listener = self
    }

    // Events: callStateChanged {state, from, uuid}, callIncoming, callAnswered, callConnected, callEnded, callMuted, registrationChanged.
    func portalVoiceEvent(_ event: String, data: [String: Any]) {
        notifyListeners(event, data: data)
    }

    @objc func register(_ call: CAPPluginCall) {
        guard let token = call.getString("accessToken"), !token.isEmpty else {
            call.reject("accessToken is required")
            return
        }
        DispatchQueue.main.async {
            PortalVoiceEngine.shared.register(accessToken: token) { ok, error in
                var result: [String: Any] = ["registered": ok]
                if let error = error { result["error"] = error }
                call.resolve(result)
            }
        }
    }

    @objc func unregister(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            PortalVoiceEngine.shared.unregister { call.resolve() }
        }
    }

    @objc func mute(_ call: CAPPluginCall) {
        let muted = call.getBool("muted") ?? true
        DispatchQueue.main.async {
            PortalVoiceEngine.shared.setMuted(muted)
            call.resolve(["muted": muted])
        }
    }

    @objc func speaker(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? true
        DispatchQueue.main.async {
            let now = PortalVoiceEngine.shared.setSpeaker(on)
            call.resolve(["speaker": now])
        }
    }

    @objc func hangup(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            PortalVoiceEngine.shared.hangUp()
            call.resolve()
        }
    }

    @objc func getState(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(PortalVoiceEngine.shared.state())
        }
    }
}
