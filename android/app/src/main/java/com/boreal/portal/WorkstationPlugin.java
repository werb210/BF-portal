package com.boreal.portal;

// BF_ANDROID_STAFF_v1 - the "IPadWorkstation" plugin on Android (src/native/ipadWorkstation.ts, ipadDocuments.ts):
//   scanCard        camera photo of a business card, read on the device (ML Kit text recognition, no upload),
//                   lines returned to the portal's contact form prefill (cardScanPrefill.ts) exactly like the iPad
//   preview / previewDocument   open a document in the phone's own viewer (the iPad's Quick Look)
//   annotate / annotateAll      "Mark up / Sign" a PDF with a finger or stylus (MarkupActivity, the Pencil annotator)

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Rect;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.MimeTypeMap;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(
    name = "IPadWorkstation",
    permissions = { @Permission(alias = WorkstationPlugin.CAMERA, strings = { Manifest.permission.CAMERA }) }
)
public class WorkstationPlugin extends Plugin {

    static final String CAMERA = "camera";
    private File cardPhoto;

    // ------------------------------------------------------------------ business card

    @PluginMethod
    public void scanCard(PluginCall call) {
        if (getPermissionState(CAMERA) != PermissionState.GRANTED) {
            requestPermissionForAlias(CAMERA, call, "scanAfterPermission");
            return;
        }
        launchCamera(call);
    }

    @PermissionCallback
    private void scanAfterPermission(PluginCall call) {
        if (getPermissionState(CAMERA) != PermissionState.GRANTED) { cancelledCard(call); return; }
        launchCamera(call);
    }

    private void launchCamera(PluginCall call) {
        try {
            File dir = new File(getContext().getCacheDir(), "cardscan");
            if (!dir.exists() && !dir.mkdirs()) throw new IOException("no cache folder");
            cardPhoto = new File(dir, "card-" + System.currentTimeMillis() + ".jpg");
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", cardPhoto);
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                .putExtra(MediaStore.EXTRA_OUTPUT, uri)
                .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(call, intent, "cardCaptured");
        } catch (IOException | ActivityNotFoundException | IllegalArgumentException e) {
            cancelledCard(call);
        }
    }

    @ActivityCallback
    private void cardCaptured(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || cardPhoto == null || !cardPhoto.exists() || cardPhoto.length() == 0) {
            cancelledCard(call);
            return;
        }
        final File photo = cardPhoto;
        try {
            InputImage image = InputImage.fromFilePath(getContext(), Uri.fromFile(photo));
            TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).process(image)
                .addOnSuccessListener(text -> {
                    JSObject r = new JSObject();
                    r.put("cancelled", false);
                    r.put("lines", new JSArray(cardLines(text)));
                    call.resolve(r);
                    //noinspection ResultOfMethodCallIgnored
                    photo.delete();
                })
                .addOnFailureListener(e -> {
                    cancelledCard(call);
                    //noinspection ResultOfMethodCallIgnored
                    photo.delete();
                });
        } catch (IOException e) {
            cancelledCard(call);
        }
    }

    /** Lines top to bottom, then left to right, as the iPad's Vision scan returns them. */
    static List<String> cardLines(Text text) {
        List<Text.Line> lines = new ArrayList<>();
        for (Text.TextBlock block : text.getTextBlocks()) lines.addAll(block.getLines());
        Collections.sort(lines, (a, b) -> {
            Rect ra = a.getBoundingBox();
            Rect rb = b.getBoundingBox();
            if (ra == null || rb == null) return 0;
            if (Math.abs(ra.top - rb.top) > Math.max(8, ra.height() / 2)) return Integer.compare(ra.top, rb.top);
            return Integer.compare(ra.left, rb.left);
        });
        List<String> out = new ArrayList<>();
        for (Text.Line l : lines) {
            String s = l.getText().trim();
            if (!s.isEmpty()) out.add(s);
        }
        return out;
    }

    private void cancelledCard(PluginCall call) {
        JSObject r = new JSObject();
        r.put("cancelled", true);
        r.put("lines", new JSArray());
        call.resolve(r);
    }

    // ------------------------------------------------------------------ documents

    private static String safeName(String name, String fallback) {
        String n = name == null ? "" : name.replaceAll("[^A-Za-z0-9._ ()-]", "_").trim();
        return n.isEmpty() ? fallback : n;
    }

    /** The document as a file in the app's cache: from base64 `data`, or a file:// or app path. */
    private File materialise(PluginCall call, String fallbackName) throws IOException {
        String name = safeName(call.getString("name", call.getString("filename", null)), fallbackName);
        File dir = new File(getContext().getCacheDir(), "documents");
        if (!dir.exists() && !dir.mkdirs()) throw new IOException("no cache folder");
        String data = call.getString("data", null);
        if (data != null && !data.isEmpty()) {
            File out = new File(dir, System.currentTimeMillis() + "-" + name);
            try (OutputStream os = new FileOutputStream(out)) {
                os.write(Base64.decode(data, Base64.DEFAULT));
            }
            return out;
        }
        String path = call.getString("path", call.getString("url", ""));
        if (path != null && path.startsWith("file://")) path = Uri.parse(path).getPath();
        if (path == null || path.isEmpty()) throw new IOException("no document");
        File source = new File(path);
        File out = new File(dir, System.currentTimeMillis() + "-" + safeName(source.getName(), name));
        try (InputStream in = new FileInputStream(source); OutputStream os = new FileOutputStream(out)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
        }
        return out;
    }

    private boolean openViewer(File file) {
        String ext = MimeTypeMap.getFileExtensionFromUrl(Uri.fromFile(file).toString()).toLowerCase(Locale.ROOT);
        String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
        Intent view = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, mime == null ? "application/octet-stream" : mime)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getActivity().startActivity(Intent.createChooser(view, getContext().getString(R.string.bf_open_with))
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
            return true;
        } catch (ActivityNotFoundException e) {
            return false;
        }
    }

    @PluginMethod
    public void preview(PluginCall call) {
        JSObject r = new JSObject();
        try {
            openViewer(materialise(call, "document"));
        } catch (IOException ignored) {
            // nothing to show
        }
        r.put("dismissed", true);
        call.resolve(r);
    }

    @PluginMethod
    public void previewDocument(PluginCall call) {
        JSObject r = new JSObject();
        boolean shown;
        try {
            shown = openViewer(materialise(call, "document"));
        } catch (IOException e) {
            shown = false;
        }
        r.put("shown", shown);
        call.resolve(r);
    }

    @PluginMethod
    public void annotate(PluginCall call) {
        startMarkup(call, "markupSingleDone");
    }

    @PluginMethod
    public void annotateAll(PluginCall call) {
        startMarkup(call, "markupAllDone");
    }

    private void startMarkup(PluginCall call, String callback) {
        try {
            File input = materialise(call, "document.pdf");
            Intent intent = new Intent(getContext(), MarkupActivity.class).putExtra(MarkupActivity.EXTRA_INPUT, input.getAbsolutePath());
            startActivityForResult(call, intent, callback);
        } catch (IOException e) {
            JSObject r = new JSObject();
            r.put("cancelled", true);
            r.put("path", "");
            r.put("pages", 0);
            call.resolve(r);
        }
    }

    @ActivityCallback
    private void markupSingleDone(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        String out = markupOutput(result);
        if (out == null) { r.put("cancelled", true); call.resolve(r); return; }
        try (InputStream in = new FileInputStream(out)) {
            byte[] bytes = readAll(in);
            r.put("cancelled", false);
            r.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
        } catch (IOException e) {
            r.put("cancelled", true);
        }
        call.resolve(r);
    }

    @ActivityCallback
    private void markupAllDone(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        String out = markupOutput(result);
        r.put("cancelled", out == null);
        r.put("path", out == null ? "" : Uri.fromFile(new File(out)).toString());
        r.put("pages", result.getData() == null ? 0 : result.getData().getIntExtra(MarkupActivity.EXTRA_PAGES, 0));
        call.resolve(r);
    }

    private static String markupOutput(ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) return null;
        String out = result.getData().getStringExtra(MarkupActivity.EXTRA_OUTPUT);
        return out != null && new File(out).exists() ? out : null;
    }

    private static byte[] readAll(InputStream in) throws IOException {
        java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
        byte[] buf = new byte[64 * 1024];
        int n;
        while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
        return bos.toByteArray();
    }
}
