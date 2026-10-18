import Capacitor
import UIKit
import LocalAuthentication

class BorealBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        // BF_PORTAL_FACE_ID_v243
        bridge?.registerPluginInstance(BiometricUnlockPlugin())
        // BF_PORTAL_IPAD_WIRING_v238 - Quick Look, Pencil and card scan were never registered.
        bridge?.registerPluginInstance(IPadWorkstationPlugin())
        bridge?.registerPluginInstance(PortalLauncherPlugin()) // BF_PORTAL_BLOCK_v556
        bridge?.registerPluginInstance(BorealVoicePlugin()) // BF_PORTAL_v817_IPAD_VOIP
    }

    // BF_PORTAL_v823_KEYBOARD - hardware-keyboard shortcuts the iPad lists when you hold Cmd. Each one is handed to
    // the web app as a "boreal:shortcut" event (useCommandShortcuts / useKeyboardShortcuts act on it), so the iPad and
    // the browser run the same code.
    override var keyCommands: [UIKeyCommand]? {
        let entries: [(input: String, modifiers: UIKeyModifierFlags, title: String, action: String)] = [
            ("k", .command, "Ask Maya", "focus-maya"),
            ("1", .command, "Application tab", "tab-1"),
            ("2", .command, "Banking Analysis tab", "tab-2"),
            ("3", .command, "Financials tab", "tab-3"),
            ("4", .command, "Documents tab", "tab-4"),
            ("d", [.command, .shift], "Go to Dashboard", "go-dashboard"),
            ("p", [.command, .shift], "Go to Pipeline", "go-pipeline"),
            ("c", [.command, .shift], "Go to CRM", "go-crm"),
            ("m", [.command, .shift], "Go to Communications", "go-communications"),
            ("t", [.command, .shift], "Go to Tasks", "go-tasks"),
            ("/", .command, "Keyboard shortcuts", "help"),
        ]
        return entries.map { entry in
            let command = UIKeyCommand(title: entry.title, action: #selector(borealShortcut(_:)), input: entry.input,
                                       modifierFlags: entry.modifiers, propertyList: entry.action)
            command.wantsPriorityOverSystemBehavior = true
            return command
        }
    }

    @objc private func borealShortcut(_ sender: UIKeyCommand) {
        guard let action = sender.propertyList as? String,
              action.range(of: "^[a-z0-9-]+$", options: .regularExpression) != nil else { return }
        bridge?.webView?.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('boreal:shortcut', { detail: '\(action)' }))",
            completionHandler: nil
        )
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
