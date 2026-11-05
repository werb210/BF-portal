# Native release readiness

## Supported product matrix

| Platform | Status |
| --- | --- |
| Web / PWA | Ready |
| iPadOS native app | Ready |
| iPhone native app | Unsupported |
| Android staff app (phones and tablets) | Built in CI (BF_ANDROID_STAFF_v1) |

`android/` is the Android staff app (BF_ANDROID_STAFF_v1) for phones and tablets: the staff portal with fingerprint/face lock, business-card scan, PDF mark-up, Share -> deal and push alerts, on the same Capacitor Android set-up as BF-client. Calls are made and taken by the Android dialler (boreal-dialer-ios `android/`): the portal's Call buttons open it with `borealdialer://call?phone=...`, and the portal never rings itself, so one phone has one calling engine. With the dialler on the same phone, call and message alerts show from the dialler and task alerts from the portal. `.github/workflows/android.yml` builds a debug APK and an unsigned release bundle (AAB) on every pull request and, run by hand, a signed release bundle that it uploads to Google Play's internal track when the secrets are set (it skips the upload with a notice otherwise).

Local build (Android Studio or the Android SDK installed):

```sh
npm ci && npm run build
npm run android:sync                       # npx cap sync android
node scripts/android-google-services.mjs   # placeholder unless GOOGLE_SERVICES_JSON is set
cd android && gradle assembleDebug          # Gradle 8.14 (the wrapper jar is not committed)
```

## Local iPadOS build

BF-Portal requires Node 22 and npm 10 or newer. On macOS with Xcode installed, run the web checks and sync before building the unsigned Simulator application:

```sh
npm ci
npm run typecheck
npm run test:ci
npm run build
test -f dist/index.html
npx cap sync ios
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  clean build
```

The App scheme embeds BorealWidget and compiles it as part of the complete application build. Both the App and BorealWidget targets specify iPad as their only device family.

## BF PORTAL IPADOS

### READY

- Existing Capacitor iOS project
- Application identifier `com.boreal.portal`
- iPad-only App and BorealWidget targets
- Working BorealWidget architecture, WidgetBridgePlugin, snapshot provider, summary model, SummaryWidget, and `group.com.boreal.portal` App Group contract
- Existing shared `bfportal://` deep-link routing
- Widget publishing and App Group persistence remain iPadOS-only; staff authentication is never placed in widget/App Group storage

### NEEDS APPLE CREDENTIALS/MANUAL SETUP

- Paid Apple Developer team
- Production provisioning
- Push configuration where applicable
- TestFlight and App Store submission
