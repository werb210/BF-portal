import PDFKit
import PencilKit
import UIKit

// v115-multipage-annotate
final class BorealDrawingAnnotation: PDFAnnotation {
    private let overlayImage: UIImage

    init(pageBounds: CGRect, image: UIImage) {
        overlayImage = image
        super.init(bounds: pageBounds, forType: .stamp, withProperties: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func draw(with box: PDFDisplayBox, in context: CGContext) {
        context.saveGState()
        context.translateBy(x: bounds.origin.x, y: bounds.origin.y + bounds.height)
        context.scaleBy(x: 1, y: -1)
        UIGraphicsPushContext(context)
        overlayImage.draw(in: CGRect(origin: .zero, size: bounds.size))
        UIGraphicsPopContext()
        context.restoreGState()
    }
}

@available(iOS 16.0, *)
final class MultiPageAnnotatorViewController: UIViewController {
    private let sourceURL: URL
    private let completion: (URL?, Int, Bool) -> Void
    private let pdfView = PDFView()
    private let toolPicker = PKToolPicker()
    private var canvases: [Int: PKCanvasView] = [:]
    private var finished = false

    init(url: URL, completion: @escaping (URL?, Int, Bool) -> Void) {
        sourceURL = url
        self.completion = completion
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        title = sourceURL.lastPathComponent
        pdfView.translatesAutoresizingMaskIntoConstraints = false
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        pdfView.usePageViewController(false)
        pdfView.document = PDFDocument(url: sourceURL)
        pdfView.pageOverlayViewProvider = self
        view.addSubview(pdfView)
        NSLayoutConstraint.activate([
            pdfView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            pdfView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            pdfView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            pdfView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(handleDone))
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(handleCancel))
    }

    @objc private func handleDone() {
        guard !finished else { return }
        finished = true
        guard let document = pdfView.document else {
            completion(nil, 0, true)
            dismiss(animated: true)
            return
        }
        var annotated = 0
        for index in 0..<document.pageCount {
            guard let page = document.page(at: index), let canvas = canvases[index],
                  !canvas.drawing.strokes.isEmpty, canvas.bounds.width > 0, canvas.bounds.height > 0 else { continue }
            let image = canvas.drawing.image(from: canvas.bounds, scale: 2)
            page.addAnnotation(BorealDrawingAnnotation(pageBounds: page.bounds(for: .mediaBox), image: image))
            annotated += 1
        }
        let output = FileManager.default.temporaryDirectory.appendingPathComponent("annotated-\(UUID().uuidString).pdf")
        let wrote = document.write(to: output)
        completion(wrote ? output : nil, annotated, false)
        dismiss(animated: true)
    }

    @objc private func handleCancel() {
        guard !finished else { return }
        finished = true
        completion(nil, 0, true)
        dismiss(animated: true)
    }
}

@available(iOS 16.0, *)
extension MultiPageAnnotatorViewController: PDFPageOverlayViewProvider {
    func pdfView(_ view: PDFView, overlayViewFor page: PDFPage) -> UIView? {
        guard let document = view.document else { return nil }
        let index = document.index(for: page)
        if let existing = canvases[index] { return existing }
        let canvas = PKCanvasView()
        canvas.drawingPolicy = .anyInput
        canvas.backgroundColor = .clear
        canvas.isOpaque = false
        canvas.tool = PKInkingTool(.pen, color: .systemBlue, width: 4)
        canvases[index] = canvas
        toolPicker.addObserver(canvas)
        toolPicker.setVisible(true, forFirstResponder: canvas)
        canvas.becomeFirstResponder()
        return canvas
    }
}
