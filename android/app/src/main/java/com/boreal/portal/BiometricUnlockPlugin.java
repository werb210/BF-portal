package com.boreal.portal;

// BF_ANDROID_STAFF_v1 - the "BiometricUnlock" plugin on Android (src/native/biometricLockPolicy.ts): fingerprint or
// face unlock through BiometricPrompt guards returning to a signed-in portal, like Face ID on the iPad. The text-code
// sign-in stays the way in; this only locks the app after it has been in the background.

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BiometricUnlock")
public class BiometricUnlockPlugin extends Plugin {

    private static final int AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_WEAK;

    @PluginMethod
    public void status(PluginCall call) {
        int result = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
        boolean available = result == BiometricManager.BIOMETRIC_SUCCESS;
        JSObject r = new JSObject();
        r.put("available", available);
        r.put("biometryType", available ? "biometric" : "none");
        call.resolve(r);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        String reason = call.getString("reason", getContext().getString(R.string.app_name));
        FragmentActivity activity = getActivity();
        activity.runOnUiThread(() -> {
            BiometricPrompt prompt = new BiometricPrompt(activity, ContextCompat.getMainExecutor(activity),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        JSObject r = new JSObject();
                        r.put("ok", true);
                        call.resolve(r);
                    }

                    @Override
                    public void onAuthenticationError(int code, @NonNull CharSequence message) {
                        JSObject r = new JSObject();
                        r.put("ok", false);
                        r.put("error", message.toString());
                        call.resolve(r);
                    }
                    // onAuthenticationFailed (one unrecognised try) keeps the prompt open; nothing to do.
                });
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(reason == null ? getContext().getString(R.string.app_name) : reason)
                .setNegativeButtonText(getContext().getString(R.string.bf_cancel))
                .setAllowedAuthenticators(AUTHENTICATORS)
                .build();
            try {
                prompt.authenticate(info);
            } catch (RuntimeException e) {
                JSObject r = new JSObject();
                r.put("ok", false);
                r.put("error", String.valueOf(e.getMessage()));
                call.resolve(r);
            }
        });
    }
}
