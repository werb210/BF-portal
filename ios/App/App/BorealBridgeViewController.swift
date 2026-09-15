import Capacitor

class BorealBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        // BF_PORTAL_IPAD_WIRING_v238 - Quick Look, Pencil and card scan were never registered.
        bridge?.registerPluginInstance(IPadWorkstationPlugin())
    }
}
