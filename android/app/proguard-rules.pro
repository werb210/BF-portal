# BF_ANDROID_STAFF_v1 - release builds run R8 (minifyEnabled true). Capacitor finds plugins, plugin methods and the
# JS bridge by reflection and by name from JavaScript, so anything R8 renames or strips here breaks at run time only
# (the JavaScript call silently resolves to "not implemented").

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,Exceptions
-keepattributes SourceFile,LineNumberTable

# Capacitor core (bridge, plugin base classes, annotations).
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

# Any @CapacitorPlugin class (ours and third-party) and its callable methods.
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
    public <init>(...);
}
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
}

# WebView JavaScript interfaces.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Cordova compatibility layer bundled with @capacitor/android.
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin { *; }
-dontwarn org.apache.cordova.**

# The app's own native code: plugins, the call engine (Telecom instantiates the ConnectionService by name), the
# Firebase service, the call screen and the mark-up screen.
-keep class com.boreal.portal.** { *; }

# Installed Capacitor plugins (package.json), by Java package.
-keep class com.capacitorjs.plugins.app.** { *; }
-keep class com.capacitorjs.plugins.applauncher.** { *; }
-keep class com.capacitorjs.plugins.filesystem.** { *; }
-keep class com.capacitorjs.plugins.pushnotifications.** { *; }
-keep class com.capacitorjs.plugins.splashscreen.** { *; }
-keep class com.aparajita.capacitor.securestorage.** { *; }
-keep class io.ionic.libs.** { *; }
-dontwarn io.ionic.libs.**

-keepattributes InnerClasses

# Firebase Cloud Messaging.
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# ML Kit text recognition (business-card scan) and the Play services it runs through.
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

-keep class androidx.biometric.** { *; }
