package com.boreal.portal;

// BF_ANDROID_STAFF_v1 - every Firebase message for the Android staff app arrives here (the push plugin's own service
// is removed in AndroidManifest.xml so there is exactly one): BF-Server staff alerts (missed call, voicemail, client
// message, text, Maya handoff, task due) are data-only messages, drawn here so they show even when the app is closed,
// then handed to the push plugin so an open portal hears about them too. Incoming calls never come here: they ring
// in the Android dialler (boreal-dialer-ios android/).

import androidx.annotation.NonNull;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class PortalMessagingService extends MessagingService {

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        super.onMessageReceived(message);
        StaffAlertNotifier.show(this, message.getData(), message.getMessageId());
    }
}
