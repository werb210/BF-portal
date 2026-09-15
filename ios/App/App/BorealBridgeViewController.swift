import Capacitor
import LocalAuthentication

class BorealBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        // BF_PORTAL_FACE_ID_v243
        bridge?.registerPluginInstance(BiometricUnlockPlugin())
        // BF_PORTAL_IPAD_WIRING_v238 - Quick Look, Pencil and card scan were never registered.
        bridge?.registerPluginInstance(IPadWorkstationPlugin())
    }
}

// BF_PORTAL_FACE_ID_v243
// Face ID / Touch ID with device passcode fallback. Lives in this file because it
// is already in the App target, so no Xcode project edit is needed.
@objc(BiometricUnlockPlugin)
public class BiometricUnlockPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiometricUnlockPlugin"
    public let jsName = "BiometricUnlock"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    @objc func status(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let available = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        var type = "none"
        if available {
            switch context.biometryType {
            case .faceID: type = "faceID"
            case .touchID: type = "touchID"
            default: type = "faceID"
            }
        }
        call.resolve(["available": available, "biometryType": type])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Unlock Boreal Portal"
        let context = LAContext()
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, _ in
            DispatchQueue.main.async { call.resolve(["ok": success]) }
        }
    }
}
