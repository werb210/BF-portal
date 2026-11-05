package com.boreal.portal;

// BF_ANDROID_STAFF_v1 - the Android staff app (phones and tablets): the staff portal in Capacitor, with the iPad
// app's native pieces (biometric lock, business-card scan, document mark-up, share-to-deal, push alerts). Calls are
// made and taken by the Android dialler, a separate app like the iPhone's (boreal-dialer-ios android/): the portal's Call
// buttons open it with borealdialer://call?phone=..., so each phone has one calling engine and never rings twice.

import android.content.ClipData;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.webkit.WebView;

import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class MainActivity extends BridgeActivity {

    /** Shared files are copied here; the portal reads them through @capacitor/filesystem (ShareToDealProvider). */
    static final String SHARED_DIR = "Shared";
    private static final long MAX_SHARED_BYTES = 50L * 1024 * 1024;
    private final Handler main = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BiometricUnlockPlugin.class);
        registerPlugin(WorkstationPlugin.class);
        registerPlugin(PortalLauncherPlugin.class);
        super.onCreate(savedInstanceState);
        applyTextSize();
        publishShortcuts();
    }

    /** Long-press the app icon: Messages, Tasks (each a PortalLauncher route). */
    private void publishShortcuts() {
        try {
            List<ShortcutInfoCompat> list = new ArrayList<>();
            list.add(shortcut("messages", R.string.bf_shortcut_messages, R.string.bf_shortcut_messages_long, R.drawable.ic_shortcut_messages, "/communications"));
            list.add(shortcut("tasks", R.string.bf_shortcut_tasks, R.string.bf_shortcut_tasks_long, R.drawable.ic_shortcut_tasks, "/tasks"));
            ShortcutManagerCompat.setDynamicShortcuts(this, list);
        } catch (RuntimeException ignored) {
            // launcher without shortcuts
        }
    }

    private ShortcutInfoCompat shortcut(String id, int shortLabel, int longLabel, int icon, String route) {
        Intent intent = new Intent(this, MainActivity.class).setAction(Intent.ACTION_VIEW)
            .putExtra(StaffAlertNotifier.EXTRA_ROUTE, route);
        return new ShortcutInfoCompat.Builder(this, id)
            .setShortLabel(getString(shortLabel))
            .setLongLabel(getString(longLabel))
            .setIcon(IconCompat.createWithResource(this, icon))
            .setIntent(intent)
            .build();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyTextSize();
    }

    /** Called for a new launch intent and, by BridgeActivity, for the first one too. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent == null) return;
        String route = routeFor(intent);
        if (route != null) PortalLauncherPlugin.deliver(route);
        String action = intent.getAction();
        if (Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) takeShared(intent);
    }

    /** Shortcuts carry their route in an extra. */
    static String routeFor(Intent intent) {
        String extra = intent.getStringExtra(StaffAlertNotifier.EXTRA_ROUTE);
        return extra != null && !extra.isEmpty() ? extra : null;
    }

    // ------------------------------------------------------------------ share to deal

    private void takeShared(Intent intent) {
        List<Uri> uris = new ArrayList<>();
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            Uri one = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (one != null) uris.add(one);
        } else {
            ArrayList<Uri> many = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (many != null) uris.addAll(many);
        }
        ClipData clip = intent.getClipData();
        if (uris.isEmpty() && clip != null) {
            for (int i = 0; i < clip.getItemCount(); i++) if (clip.getItemAt(i).getUri() != null) uris.add(clip.getItemAt(i).getUri());
        }
        if (uris.isEmpty()) return;
        new Thread(() -> {
            for (Uri uri : uris) {
                File copy = copyShared(uri);
                // Delivered as an "app opened with a file" event, the same event the iPad's share extension produces.
                if (copy != null) main.post(() -> {
                    if (getBridge() != null) getBridge().onNewIntent(new Intent(Intent.ACTION_VIEW, Uri.fromFile(copy)));
                });
            }
        }, "bf-share").start();
    }

    private File copyShared(Uri uri) {
        String name = displayName(uri);
        File dir = new File(getFilesDir(), SHARED_DIR);
        if (!dir.exists() && !dir.mkdirs()) return null;
        File out = new File(dir, UUID.randomUUID() + "-" + name);
        long total = 0;
        try (InputStream in = getContentResolver().openInputStream(uri); OutputStream os = new FileOutputStream(out)) {
            if (in == null) return null;
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) {
                total += n;
                if (total > MAX_SHARED_BYTES) throw new IOException("too large");
                os.write(buf, 0, n);
            }
            return out;
        } catch (IOException | SecurityException e) {
            //noinspection ResultOfMethodCallIgnored
            out.delete();
            return null;
        }
    }

    private String displayName(Uri uri) {
        String name = null;
        try (Cursor c = getContentResolver().query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) name = c.getString(0);
        } catch (RuntimeException ignored) {
            // fall back to the last path segment
        }
        if (name == null || name.trim().isEmpty()) name = uri.getLastPathSegment();
        String clean = name == null ? "" : name.replaceAll("[^A-Za-z0-9._ ()-]", "_").trim();
        return clean.isEmpty() ? "shared-file" : clean;
    }

    // ------------------------------------------------------------------ readability

    /** The WebView ignores Android's font size by default; follow it (capped at 140% so screens still fit). */
    static int textZoomFor(float fontScale) {
        return Math.round(Math.max(0.85f, Math.min(fontScale, 1.4f)) * 100);
    }

    private void applyTextSize() {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        webView.getSettings().setTextZoom(textZoomFor(getResources().getConfiguration().fontScale));
    }
}
