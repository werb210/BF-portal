// BF_PORTAL_BLOCK_v113_IPAD_PENCIL_QUICKLOOK_CARDSCAN
import Foundation
import Capacitor
import QuickLook
import PencilKit
import PDFKit
import Vision
import VisionKit
import UIKit

@objc(IPadWorkstationPlugin)
public class IPadWorkstationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IPadWorkstationPlugin"
    public let jsName = "IPadWorkstation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "preview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "annotate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "annotateAll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "previewDocument", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scanCard", returnType: CAPPluginReturnPromise)
    ]

    private var previewURL: URL?
    private var annotateURL: URL?
    private var pendingCallID: String?

    private func materialize(_ call: CAPPluginCall) -> URL? {
        guard let base64 = call.getString("data"), let bytes = Data(base64Encoded: base64) else {
            call.reject("A base64 'data' string is required")
            return nil
        }
        let name = call.getString("filename") ?? "document"
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
            .appendingPathComponent(name)
        do {
            try FileManager.default.createDirectory(
                at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try bytes.write(to: url)
            return url
        } catch {
            call.reject("Unable to stage file: \(error.localizedDescription)")
            return nil
        }
    }

    private func hold(_ call: CAPPluginCall) {
        call.keepAlive = true
        bridge?.saveCall(call)
        pendingCallID = call.callbackId
    }

    private func release() -> CAPPluginCall? {
        guard let id = pendingCallID, let call = bridge?.savedCall(withID: id) else { return nil }
        bridge?.releaseCall(call)
        pendingCallID = nil
        return call
    }

    @objc public func preview(_ call: CAPPluginCall) {
        guard let url = materialize(call) else { return }
        previewURL = url
        hold(call)
        DispatchQueue.main.async { [weak self] in
            guard let self, let host = self.bridge?.viewController else {
                _ = self?.release().map { $0.reject("No host view controller") }
                return
            }
            let controller = QLPreviewController()
            controller.dataSource = self
            controller.delegate = self
            host.present(controller, animated: true)
        }
    }

    @objc public func annotate(_ call: CAPPluginCall) {
        guard let url = materialize(call) else { return }
        annotateURL = url
        hold(call)
        DispatchQueue.main.async { [weak self] in
            guard let self, let host = self.bridge?.viewController else {
                _ = self?.release().map { $0.reject("No host view controller") }
                return
            }
            let controller = AnnotateViewController(fileURL: url)
            controller.onFinish = { [weak self] base64 in
                guard let saved = self?.release() else { return }
                if let base64 { saved.resolve(["cancelled": false, "data": base64]) }
                else { saved.resolve(["cancelled": true]) }
            }
            controller.modalPresentationStyle = .fullScreen
            host.present(controller, animated: true)
        }
    }

    @objc public func scanCard(_ call: CAPPluginCall) {
        guard VNDocumentCameraViewController.isSupported else {
            call.reject("Document scanning is not supported on this device")
            return
        }
        hold(call)
        DispatchQueue.main.async { [weak self] in
            guard let self, let host = self.bridge?.viewController else {
                _ = self?.release().map { $0.reject("No host view controller") }
                return
            }
            let controller = VNDocumentCameraViewController()
            controller.delegate = self
            host.present(controller, animated: true)
        }
    }

    private func recognizeText(in image: UIImage, completion: @escaping ([String]) -> Void) {
        guard let cgImage = image.cgImage else { completion([]); return }
        let request = VNRecognizeTextRequest { request, _ in
            let lines = (request.results as? [VNRecognizedTextObservation] ?? [])
                .compactMap { $0.topCandidates(1).first?.string }
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
            completion(lines)
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        DispatchQueue.global(qos: .userInitiated).async {
            try? VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
        }
    }
}

// v115-ipad-documents
extension IPadWorkstationPlugin {
    private func borealResolveURL(_ call: CAPPluginCall) -> URL? {
        for key in ["path", "url", "filePath", "uri"] {
            guard let raw = call.getString(key), !raw.isEmpty else { continue }
            if raw.hasPrefix("file://") || raw.hasPrefix("http://") || raw.hasPrefix("https://") {
                return URL(string: raw)
            }
            return URL(fileURLWithPath: raw)
        }
        guard let encoded = call.getString("data"), !encoded.isEmpty else { return nil }
        let cleaned = encoded.split(separator: ",", maxSplits: 1).last.map(String.init) ?? encoded
        guard let bytes = Data(base64Encoded: cleaned) else { return nil }
        let name = call.getString("name") ?? "document-\(UUID().uuidString).pdf"
        let output = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        do {
            try bytes.write(to: output)
            return output
        } catch {
            return nil
        }
    }

    @objc public func annotateAll(_ call: CAPPluginCall) {
        guard let url = borealResolveURL(call) else {
            call.reject("A file path, URL, or base64 data is required")
            return
        }
        guard #available(iOS 16.0, *) else {
            call.reject("Multi-page annotation requires iOS 16 or later")
            return
        }
        DispatchQueue.main.async {
            guard let host = self.bridge?.viewController else {
                call.reject("No view controller available")
                return
            }
            let annotator = MultiPageAnnotatorViewController(url: url) { output, pages, cancelled in
                call.resolve(["cancelled": cancelled, "pages": cancelled ? 0 : pages, "path": output?.path ?? ""])
            }
            let navigation = UINavigationController(rootViewController: annotator)
            navigation.modalPresentationStyle = .fullScreen
            host.present(navigation, animated: true)
        }
    }

    @objc public func previewDocument(_ call: CAPPluginCall) {
        guard let url = borealResolveURL(call) else {
            call.reject("A file path, URL, or base64 data is required")
            return
        }
        DispatchQueue.main.async {
            guard let host = self.bridge?.viewController else {
                call.reject("No view controller available")
                return
            }
            let coordinator = BorealPreviewCoordinator(url: url)
            BorealPreviewCoordinator.retained = coordinator
            let controller = QLPreviewController()
            controller.dataSource = coordinator
            host.present(controller, animated: true)
            call.resolve(["shown": true])
        }
    }
}

final class BorealPreviewCoordinator: NSObject, QLPreviewControllerDataSource {
    static var retained: BorealPreviewCoordinator?
    private let url: URL

    init(url: URL) { self.url = url }

    func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }

    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        url as NSURL
    }
}

extension IPadWorkstationPlugin: QLPreviewControllerDataSource, QLPreviewControllerDelegate {
    public func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
        previewURL == nil ? 0 : 1
    }

    public func previewController(
        _ controller: QLPreviewController,
        previewItemAt index: Int
    ) -> QLPreviewItem {
        (previewURL ?? URL(fileURLWithPath: "/dev/null")) as NSURL
    }

    public func previewControllerDidDismiss(_ controller: QLPreviewController) {
        release()?.resolve(["dismissed": true])
    }
}

extension IPadWorkstationPlugin: VNDocumentCameraViewControllerDelegate {
    public func documentCameraViewController(
        _ controller: VNDocumentCameraViewController,
        didFinishWith scan: VNDocumentCameraScan
    ) {
        controller.dismiss(animated: true)
        guard scan.pageCount > 0 else {
            release()?.resolve(["cancelled": false, "lines": [String]()])
            return
        }
        recognizeText(in: scan.imageOfPage(at: 0)) { [weak self] lines in
            DispatchQueue.main.async {
                self?.release()?.resolve(["cancelled": false, "lines": lines])
            }
        }
    }

    public func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
        controller.dismiss(animated: true)
        release()?.resolve(["cancelled": true, "lines": [String]()])
    }

    public func documentCameraViewController(
        _ controller: VNDocumentCameraViewController,
        didFailWithError error: Error
    ) {
        controller.dismiss(animated: true)
        release()?.reject("Scan failed: \(error.localizedDescription)")
    }
}

/// Page 1 annotation. Multi-page ink is out of scope for v113.
final class AnnotateViewController: UIViewController {
    private let fileURL: URL
    private let pdfView = PDFView()
    private let canvas = PKCanvasView()
    private let toolPicker = PKToolPicker()
    var onFinish: ((String?) -> Void)?

    init(fileURL: URL) {
        self.fileURL = fileURL
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is unused") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        let bar = UINavigationBar()
        let item = UINavigationItem(title: fileURL.lastPathComponent)
        item.leftBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .cancel, target: self, action: #selector(cancelTapped))
        item.rightBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .done, target: self, action: #selector(doneTapped))
        bar.items = [item]
        for subview in [bar, pdfView, canvas] as [UIView] {
            subview.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(subview)
        }
        pdfView.document = PDFDocument(url: fileURL)
        pdfView.autoScales = true
        pdfView.isUserInteractionEnabled = false
        canvas.backgroundColor = .clear
        canvas.isOpaque = false
        canvas.drawingPolicy = .anyInput
        let guides = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            bar.topAnchor.constraint(equalTo: guides.topAnchor),
            bar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            pdfView.topAnchor.constraint(equalTo: bar.bottomAnchor),
            pdfView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            pdfView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            pdfView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            canvas.topAnchor.constraint(equalTo: pdfView.topAnchor),
            canvas.leadingAnchor.constraint(equalTo: pdfView.leadingAnchor),
            canvas.trailingAnchor.constraint(equalTo: pdfView.trailingAnchor),
            canvas.bottomAnchor.constraint(equalTo: pdfView.bottomAnchor)
        ])
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        toolPicker.setVisible(true, forFirstResponder: canvas)
        toolPicker.addObserver(canvas)
        canvas.becomeFirstResponder()
    }

    @objc private func cancelTapped() {
        dismiss(animated: true) { [weak self] in self?.onFinish?(nil) }
    }

    @objc private func doneTapped() {
        let base64 = flatten()
        dismiss(animated: true) { [weak self] in self?.onFinish?(base64) }
    }

    private func flatten() -> String? {
        guard let document = PDFDocument(url: fileURL), let page = document.page(at: 0) else {
            return nil
        }
        let bounds = page.bounds(for: .mediaBox)
        let ink = canvas.drawing.image(from: canvas.bounds, scale: UIScreen.main.scale)
        let renderer = UIGraphicsImageRenderer(size: bounds.size)
        let merged = renderer.image { context in
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: bounds.size))
            context.cgContext.saveGState()
            context.cgContext.translateBy(x: 0, y: bounds.size.height)
            context.cgContext.scaleBy(x: 1, y: -1)
            page.draw(with: .mediaBox, to: context.cgContext)
            context.cgContext.restoreGState()
            ink.draw(in: CGRect(origin: .zero, size: bounds.size))
        }
        guard let flatPage = PDFPage(image: merged) else { return nil }
        document.removePage(at: 0)
        document.insert(flatPage, at: 0)
        return document.dataRepresentation()?.base64EncodedString()
    }
}
