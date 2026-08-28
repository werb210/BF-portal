import Capacitor

class BorealBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
