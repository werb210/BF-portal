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

# Keep the native release surface iPadOS-only. The legacy android/ generated
# directory is intentionally ignored; only active dependencies and automation
# are prohibited.
if grep -q '"@capacitor/android"' package.json; then
  echo "Forbidden dependency detected: @capacitor/android"
  exit 1
fi

if grep -Eq '^[[:space:]]*android[[:space:]]*:' capacitor.config.ts; then
  echo "Active Android configuration detected in capacitor.config.ts"
  exit 1
fi

if grep -R -E 'cap (sync|add) android|assembleDebug|assembleRelease' .github/workflows; then
  echo "Active Android build command detected in GitHub Actions"
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
