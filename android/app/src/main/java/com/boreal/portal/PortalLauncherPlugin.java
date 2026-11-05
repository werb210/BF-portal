package com.boreal.portal;

// BF_ANDROID_STAFF_v1 - the "PortalLauncher" plugin on Android (src/native/portalLauncher.ts): where a launch should
// land. The "Phone" launcher icon and the long-press shortcuts (New call, Messages, Tasks) and "Call back" on a
// missed-call alert all arrive as a route: an in-portal path ("/communications"), "dialer:" (open the phone keypad)
// or "dial:+15551234567" (call that number). take() hands over the pending one; "route" fires for later ones.
// index()/clearIndex() are the iPad's Spotlight; Android has no equivalent, so they do nothing.

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PortalLauncher")
public class PortalLauncherPlugin extends Plugin {

    private static String pending = "";
    private static PortalLauncherPlugin instance;

    /** Only the three route shapes the portal understands (portalLauncher.ts parseLaunchRoute) are passed on. */
    static boolean validRoute(String route) {
        if (route == null) return false;
        if ("dialer:".equals(route)) return true;
        if (route.startsWith("dial:")) return route.substring(5).matches("^\\+[1-9][0-9]{7,14}$");
        return route.startsWith("/") && !route.startsWith("//") && !route.matches(".*[\\s\\\\].*") && route.length() <= 300;
    }

    /** MainActivity: a launch (cold or warm) asked for a route. */
    static void deliver(String route) {
        if (!validRoute(route)) return;
        PortalLauncherPlugin plugin = instance;
        if (plugin != null && plugin.hasListeners("route")) {
            JSObject r = new JSObject();
            r.put("route", route);
            plugin.notifyListeners("route", r);
        } else {
            pending = route;
        }
    }

    @Override
    public void load() {
        instance = this;
    }

    @PluginMethod
    public void take(PluginCall call) {
        JSObject r = new JSObject();
        r.put("route", pending);
        pending = "";
        call.resolve(r);
    }

    @PluginMethod
    public void index(PluginCall call) {
        JSObject r = new JSObject();
        r.put("indexed", 0);
        call.resolve(r);
    }

    @PluginMethod
    public void clearIndex(PluginCall call) {
        call.resolve();
    }
}
