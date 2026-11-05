#!/usr/bin/env bash
set -euo pipefail

# Block compiled JS in src
if find src -type f -name "*.js" | grep -q .; then
  echo "Compiled JS detected in src/"
  exit 1
fi

# Block legacy Twilio client usage
if grep -r "twilio-client" src; then
  echo "Forbidden dependency detected: twilio-client"
  exit 1
fi

# Ensure OTP endpoints are used correctly
if ! grep -r "/api/auth/otp/start" src > /dev/null; then
  echo "OTP start endpoint missing"
  exit 1
fi

if ! grep -r "/api/auth/otp/verify" src > /dev/null; then
  echo "OTP verify endpoint missing"
  exit 1
fi

# Prevent fetch hijack regression
if grep -r "networkGuard" src; then
  echo "networkGuard must not be reintroduced"
  exit 1
fi

# BF_ANDROID_STAFF_v1 - the portal ships as the iPad app (iOS: iPad only, below) AND as the Android staff app for
# phones and tablets (android/, .github/workflows/android.yml). Calls on Android belong to the Android dialler
# (boreal-dialer-ios android/), so the portal's Android project must not carry a calling engine of its own.
if grep -rqE 'com\.twilio|ConnectionService|MANAGE_OWN_CALLS' android/app/src android/app/build.gradle; then
  echo "The Android portal must hand calls to the Android dialler, not place them itself"
  exit 1
fi

project_file="ios/App/App.xcodeproj/project.pbxproj"
device_families="$(sed -n 's/.*TARGETED_DEVICE_FAMILY = "\([^"]*\)";.*/\1/p' "$project_file")"
device_family_count="$(printf '%s\n' "$device_families" | sed '/^$/d' | wc -l | tr -d ' ')"

if [ "$device_family_count" -lt 4 ]; then
  echo "Expected iPad device-family settings for App and BorealWidget Debug/Release configurations"
  exit 1
fi

if printf '%s\n' "$device_families" | grep -Ev '^2$' > /dev/null; then
  echo "App and BorealWidget must use only TARGETED_DEVICE_FAMILY 2 (iPad)"
  exit 1
fi

# Resolve the App target's configurations by name rather than relying on Xcode
# object IDs, then enforce its iPad and Mac compatibility settings.
python3 scripts/validate-ios-build-settings.py "$project_file"

if grep -Eq 'SUPPORTS_MACCATALYST[[:space:]]*=[[:space:]]*YES;' "$project_file"; then
  echo "Mac Catalyst must remain disabled for every iOS target"
  exit 1
fi
