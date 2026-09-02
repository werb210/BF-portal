# Native release readiness

## Supported product matrix

| Platform | Status |
| --- | --- |
| Web / PWA | Ready |
| iPadOS native app | Ready |
| iPhone native app | Unsupported |
| Android native app | Unsupported |

The tracked `android/` directory is inert historical generated output. BF-Portal does not install the Capacitor Android platform, synchronize that directory, or provide an Android build or release path.

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
