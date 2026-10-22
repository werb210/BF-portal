import Capacitor
import UIKit
import LocalAuthentication
import UniformTypeIdentifiers

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
        bridge?.registerPluginInstance(NativeFilePickerPlugin()) // BF_PORTAL_v842_MAC_FILE_PICKER
        // BF_PORTAL_v843_MAC_UPLOADS - Safari's Develop menu can inspect the app, so an upload problem can be seen.
        if #available(iOS 16.4, *) { bridge?.webView?.isInspectable = true }
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

// BF_PORTAL_v842_MAC_FILE_PICKER
// On a Mac the iPad app's web file picker (WebKit's WKFileUploadPanel) crashed the app when files came from OneDrive:
// "index 0 beyond bounds for empty array" inside -[WKFileUploadPanel documentPicker:didPickDocumentsAtURLs:], before
// any of our code ran (Oct 22). This picker asks the system for copies (asCopy: true), so cloud files are downloaded
// first, and hands the web app paths it can read. The web app uses it only on a Mac (status().onMac); the iPad keeps
// WebKit's picker with its camera and photo options. Lives in this file because it is already in the App target.
@objc(NativeFilePickerPlugin)
public class NativeFilePickerPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "NativeFilePickerPlugin"
    public let jsName = "NativeFilePicker"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pick", returnType: CAPPluginReturnPromise)
    ]
    private var pending: CAPPluginCall?

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["onMac": ProcessInfo.processInfo.isiOSAppOnMac])
    }

    @objc func pick(_ call: CAPPluginCall) {
        let multiple = call.getBool("multiple") ?? false
        let accept = call.getString("accept") ?? ""
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                call.reject("The file picker is not available right now.")
                return
            }
            // A picker left open from an earlier tap is answered as cancelled, so its promise never hangs.
            self.pending?.resolve(["files": [] as [Any]])
            self.pending = call
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: NativeFilePickerPlugin.types(for: accept), asCopy: true)
            picker.allowsMultipleSelection = multiple
            picker.delegate = self
            presenter.present(picker, animated: true)
        }
    }

    /// The <input accept="..."> list ("application/pdf,.docx,image/*") as content types; anything when empty.
    static func types(for accept: String) -> [UTType] {
        var out: [UTType] = []
        for raw in accept.split(separator: ",") {
            let token = raw.trimmingCharacters(in: .whitespaces).lowercased()
            if token.isEmpty { continue }
            if token.hasPrefix(".") {
                if let type = UTType(filenameExtension: String(token.dropFirst())) { out.append(type) }
            } else if token == "image/*" {
                out.append(.image)
            } else if token == "video/*" {
                out.append(.movie)
            } else if token == "audio/*" {
                out.append(.audio)
            } else if let type = UTType(mimeType: token) {
                out.append(type)
            }
        }
        return out.isEmpty ? [.item] : out
    }

    // BF_PORTAL_v843_MAC_UPLOADS - the file contents go back in the answer itself (base64), so the web app does not
    // have to fetch them from a capacitor:// address (v842 did, and on the Mac nothing arrived). Read off the main
    // thread; any file that cannot be read is named in "failed" so the web app can say so.
    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let call = pending else { return }
        pending = nil
        DispatchQueue.global(qos: .userInitiated).async {
            var files: [[String: Any]] = []
            var failed: [[String: Any]] = []
            for url in urls {
                let name = url.lastPathComponent
                let scoped = url.startAccessingSecurityScopedResource()
                defer { if scoped { url.stopAccessingSecurityScopedResource() } }
                var coordError: NSError?
                var data: Data?
                var readError: Error?
                NSFileCoordinator().coordinate(readingItemAt: url, options: [.withoutChanges], error: &coordError) { readable in
                    do { data = try Data(contentsOf: readable) } catch { readError = error }
                }
                if let data = data {
                    let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
                    files.append(["name": name, "mimeType": mime, "size": data.count, "data": data.base64EncodedString()])
                } else {
                    let problem: Error? = readError ?? (coordError as Error?)
                    let reason = problem?.localizedDescription ?? "the file could not be read"
                    failed.append(["name": name, "reason": reason])
                }
                try? FileManager.default.removeItem(at: url) // asCopy: our own copy
            }
            call.resolve(["files": files, "failed": failed])
        }
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pending?.resolve(["files": [] as [Any]])
        pending = nil
    }
}
