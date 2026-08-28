import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridgePlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadAllTimelines", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadTimelines", returnType: CAPPluginReturnPromise)
    ]

    private func sharedDefaults(_ call: CAPPluginCall) -> UserDefaults? {
        guard let group = call.getString("group"), !group.isEmpty else {
            call.reject("A non-empty App Group is required")
            return nil
        }
        guard let defaults = UserDefaults(suiteName: group) else {
            call.reject("Unable to open App Group UserDefaults suite: \(group)")
            return nil
        }
        return defaults
    }

    @objc public func setItem(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults(call) else { return }
        guard let key = call.getString("key"), let value = call.getString("value") else {
            call.reject("Both key and value are required")
            return
        }
        defaults.set(value, forKey: key)
        defaults.synchronize()
        call.resolve()
    }

    @objc public func removeItem(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults(call) else { return }
        guard let key = call.getString("key") else {
            call.reject("A key is required")
            return
        }
        defaults.removeObject(forKey: key)
        defaults.synchronize()
        call.resolve()
    }

    @objc public func getItem(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults(call) else { return }
        guard let key = call.getString("key") else {
            call.reject("A key is required")
            return
        }
        if let value = defaults.string(forKey: key) {
            call.resolve(["value": value])
        } else {
            call.resolve(["value": NSNull()])
        }
    }

    @objc public func reloadAllTimelines(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc public func reloadTimelines(_ call: CAPPluginCall) {
        guard let kind = call.getString("ofKind"), !kind.isEmpty else {
            call.reject("A widget kind is required")
            return
        }
        WidgetCenter.shared.reloadTimelines(ofKind: kind)
        call.resolve()
    }
}
