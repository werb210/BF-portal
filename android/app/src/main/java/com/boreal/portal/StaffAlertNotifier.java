package com.boreal.portal;

// BF_ANDROID_STAFF_v1 - draws BF-Server's staff alerts (BF-Server src/services/notifications/staffAlerts.ts,
// buildStaffFcmData). The server sends data-only FCM messages: title, body, categoryId (MISSED_CALL, VOICEMAIL,
// CLIENT_MESSAGE, SMS, HANDOFF, TASK), type, and optional url, contactId, phone, threadKind, voicemailId, senderName.
// A tap opens the portal at `url` through the push plugin's "notification tapped" event (the extras carry
// google.message_id, which is what the plugin looks for). When the Android dialler is on the same phone it draws
// the call and message alerts itself (with "Call back"); this app then draws only tasks (drawsHere).

import android.annotation.SuppressLint;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.Map;

final class StaffAlertNotifier {

    static final String CH_CALLS = "bf_alerts_calls";
    static final String CH_MESSAGES = "bf_alerts_messages";
    static final String CH_TASKS = "bf_alerts_tasks";
    static final String EXTRA_ROUTE = "bf_route";

    private StaffAlertNotifier() { }

    static String channelFor(String category) {
        switch (category) {
            case "MISSED_CALL":
            case "VOICEMAIL":
                return CH_CALLS;
            case "TASK":
                return CH_TASKS;
            default:
                return CH_MESSAGES;
        }
    }

    /** The portal page a tap opens when the server sent none. */
    static String defaultUrl(String category) {
        return "TASK".equals(category) ? "/tasks" : "/communications";
    }

    /** Only an in-portal path is followed (same rule as BF-Server portalAlertUrl and the portal's safeDeepLink). */
    static String safeUrl(String raw, String category) {
        String s = raw == null ? "" : raw.trim();
        if (!s.startsWith("/") || s.startsWith("//") || s.contains("..") || s.matches(".*[\\s\\\\].*") || s.length() > 300) {
            return defaultUrl(category);
        }
        return s;
    }

    private static void ensureChannels(Context c) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        create(nm, CH_CALLS, c.getString(R.string.bf_channel_missed_calls), NotificationManager.IMPORTANCE_HIGH);
        create(nm, CH_MESSAGES, c.getString(R.string.bf_channel_messages), NotificationManager.IMPORTANCE_HIGH);
        create(nm, CH_TASKS, c.getString(R.string.bf_channel_tasks), NotificationManager.IMPORTANCE_DEFAULT);
    }

    private static void create(NotificationManager nm, String id, String name, int importance) {
        if (nm.getNotificationChannel(id) == null) nm.createNotificationChannel(new NotificationChannel(id, name, importance));
    }

    private static String value(Map<String, String> data, String key) {
        String v = data.get(key);
        return v == null ? "" : v.trim();
    }

    /** True when the Android dialler (boreal-dialer-ios android/) is installed: it answers borealdialer:// links. */
    static boolean dialerInstalled(Context c) {
        Intent probe = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("borealdialer://call?phone=%2B14035550100"));
        return probe.resolveActivity(c.getPackageManager()) != null;
    }

    /**
     * Both Android apps get every staff alert. With the dialler on the same phone it draws the call and message
     * alerts (missed calls, voicemail, texts, client messages, handoffs) and this app draws only tasks, so nothing
     * shows twice. Without the dialler this app draws them all.
     */
    static boolean drawsHere(String category, boolean dialerOnPhone) {
        return "TASK".equals(category) || !dialerOnPhone;
    }

    @SuppressLint("MissingPermission")
    static void show(Context c, Map<String, String> data, String messageId) {
        if (data == null) return;
        String title = value(data, "title");
        String body = value(data, "body");
        if (title.isEmpty() && body.isEmpty()) return;
        String category = value(data, "categoryId");
        if (category.isEmpty()) category = "GENERIC";
        if (!drawsHere(category, dialerInstalled(c))) return;
        String url = safeUrl(value(data, "url"), category);
        String key = value(data, "type") + ":" + (value(data, "contactId").isEmpty() ? value(data, "phone") : value(data, "contactId"));
        int id = key.hashCode();
        ensureChannels(c);

        Intent tap = new Intent(c, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        // The push plugin reports a tap for intents carrying google.message_id, with every other extra as data.
        tap.putExtra("google.message_id", messageId == null || messageId.isEmpty() ? String.valueOf(System.currentTimeMillis()) : messageId);
        for (Map.Entry<String, String> e : data.entrySet()) {
            if (e.getKey() != null && e.getValue() != null && !e.getKey().startsWith("google.")) tap.putExtra(e.getKey(), e.getValue());
        }
        tap.putExtra("url", url);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

        NotificationCompat.Builder b = new NotificationCompat.Builder(c, channelFor(category))
                .setSmallIcon(R.drawable.ic_stat_portal)
                .setColor(ContextCompat.getColor(c, R.color.bf_brand))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setGroup(category)
                .setCategory("TASK".equals(category) ? NotificationCompat.CATEGORY_REMINDER
                        : ("SMS".equals(category) || "CLIENT_MESSAGE".equals(category)) ? NotificationCompat.CATEGORY_MESSAGE
                        : NotificationCompat.CATEGORY_MISSED_CALL)
                .setPriority("TASK".equals(category) ? NotificationCompat.PRIORITY_DEFAULT : NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(PendingIntent.getActivity(c, id, tap, flags));

        try {
            NotificationManagerCompat.from(c).notify(id, b.build());
        } catch (RuntimeException ignored) {
            // notifications are turned off for the app
        }
    }
}
