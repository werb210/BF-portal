// REFERRER_SIGNUP_UI_v1 - public referrer signup + on-page SignNow agreement.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const signup = readFileSync(path.join(process.cwd(), "src", "pages", "referrer", "ReferrerSignupPage.tsx"), "utf-8");
const app = readFileSync(path.join(process.cwd(), "src", "App.tsx"), "utf-8");
const layout = readFileSync(path.join(process.cwd(), "src", "pages", "referrer", "ReferrerPortalLayout.tsx"), "utf-8");

describe("referrer signup page", () => {
  it("collects name/email/phone, full address, and e-transfer email", () => {
    expect(signup).toContain('placeholder="Full name *"');
    expect(signup).toContain('placeholder="Street address *"');
    expect(signup).toContain("etransfer_email");
  });
  it("posts to /api/referrer/signup and renders the SignNow iframe", () => {
    expect(signup).toContain('"/api/referrer/signup"');
    expect(signup).toContain("<iframe");
    expect(signup).toContain("signingUrl");
  });
  it("verifies completion via /signup/complete and stores the referrer token", () => {
    expect(signup).toContain('"/api/referrer/signup/complete"');
    expect(signup).toContain('sessionStorage.setItem("referrer_token"');
    expect(signup).toContain('navigate("/referrer")');
  });
});

describe("referrer routing", () => {
  it("signup is a public route", () => {
    expect(app).toContain('path="/referrer/signup"');
    expect(app).toContain("ReferrerSignupPage");
  });
  it("un-authenticated visitors land on signup first, not login", () => {
    expect(layout).toContain('Navigate to="/referrer/signup"');
  });
});


// REFERRER_LOGIN_SIGNUP_LINK_v1 - login page must have a visible heading and a
// path to signup so a first-timer landing on /referrer/login isn't stranded.
import { readFileSync as _rf } from "node:fs";
import _path from "node:path";
import { describe as _d, expect as _e, it as _i } from "vitest";
const _login = _rf(_path.join(process.cwd(), "src", "pages", "referrer", "ReferrerLoginPage.tsx"), "utf-8");
_d("referrer login page", () => {
  _i("has a colored heading (not invisible) and links to signup", () => {
    _e(_login).toContain("REFERRER_LOGIN_SIGNUP_LINK_v1");
    _e(_login).toContain('color: "#1F3B63"');
    _e(_login).toContain('navigate("/referrer/signup")');
  });
});
