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
