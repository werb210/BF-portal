import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserAuthError } from "@azure/msal-browser";
import api from "@/api";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import ThemeToggle from "@/components/settings/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { microsoftAuthConfig } from "@/config/microsoftAuth";
import { initializeMsalClient, msalClient } from "@/auth/msal";
import { useSettingsStore } from "@/state/settings.store";
import { getErrorMessage } from "@/utils/errors";
import UserDetailsFields from "../components/UserDetailsFields";
import { logger } from "@/utils/logger";
import { bfLogMsalPhase, pickLoginStrategy } from "@/auth/msalLoginStrategy";
import { registerPasskey, passkeysSupported } from "@/auth/passkey"; // BF_PORTAL_WEBAUTHN_v1
import OutOfOfficePanel from "@/components/o365/OutOfOfficePanel"; // BF_PORTAL_O365_UI_v1
import OneDriveFilePicker from "@/components/o365/OneDriveFilePicker"; // BF_PORTAL_O365_UI_v1

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_DIMENSION = 256;

type MeResponse = {
  o365_connected?: boolean | null;
  o365_email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  profile_image_url?: string | null; // BF_PORTAL_AVATAR_PREVIEW_v1
};

// BF_PORTAL_AVATAR_FIX_v1 — downscale a chosen avatar to a small JPEG data URL so
// it can be stored as profile_image_url without a blob pipeline.
async function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("image failed"));
    i.src = dataUrl;
  });
  const scale = Math.min(1, size / Math.max(img.width || size, img.height || size));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((img.width || size) * scale));
  canvas.height = Math.max(1, Math.round((img.height || size) * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function normalizeMeProfile(data: MeResponse | null | undefined) {
  return {
    firstName: data?.first_name ?? data?.firstName ?? "",
    lastName: data?.last_name ?? data?.lastName ?? "",
    email: data?.email ?? "",
    phone: data?.phone ?? "",
    profileImage: data?.profile_image_url ?? "" // BF_PORTAL_AVATAR_PREVIEW_v1
  };
}

const ProfileSettings = () => {
  const { user } = useAuth();
  const {
    profile,
    fetchProfile,
    statusMessage,
    isLoadingProfile,
    setMicrosoftConnection,
    setStatusMessage
  } = useSettingsStore();
  const [localProfile, setLocalProfile] = useState(profile);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [microsoftError, setMicrosoftError] = useState<string | null>(null);
  const [isLinkingMicrosoft, setIsLinkingMicrosoft] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [hideMicrosoftButton, setHideMicrosoftButton] = useState(false);
  const [msalReady, setMsalReady] = useState(false);
  const [passkeyStatus, setPasskeyStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const redirectHandledRef = useRef(false);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  useEffect(() => {
    let isMounted = true;
    fetchProfile().catch((error) => {
      if (!isMounted) return;
      setFormError(getErrorMessage(error, "Unable to load profile details."));
    });
    return () => {
      isMounted = false;
    };
  }, [fetchProfile]);

  // BF_MSAL_TOKENS_SAVED_EVENT_v34 — listen for the post-silent-acquire event
  // emitted by bfAcquireSilentO365Tokens so the Connect/Connected indicator
  // updates without requiring a reload.
  useEffect(() => {
    let isMounted = true;

    const loadNameFields = async () => {
      try {
        const me = await api.get<MeResponse>("/api/users/me");
        if (!isMounted) return;
        const normalized = normalizeMeProfile(me);
        setMicrosoftConnection({ connected: Boolean(me?.o365_connected), email: me?.o365_email ?? normalized.email });
        setLocalProfile((prev) => ({
          ...prev,
          firstName: normalized.firstName || prev.firstName,
          lastName: normalized.lastName || prev.lastName,
          email: normalized.email || prev.email,
          phone: normalized.phone || prev.phone,
          profileImage: normalized.profileImage || prev.profileImage // BF_PORTAL_AVATAR_PREVIEW_v1
        }));
      } catch (error) {
        if (!isMounted) return;
        logger.warn("Unable to pre-populate profile name fields", { error });
      }
    };

    const onTokensSaved = () => {
      if (isMounted) void loadNameFields();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("bf-msal-tokens-saved", onTokensSaved as EventListener);
    }

    void loadNameFields();

    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("bf-msal-tokens-saved", onTokensSaved as EventListener);
      }
    };
  }, []);

  // MSAL v3 requires explicit initialization before any API call
  useEffect(() => {
    if (!microsoftAuthConfig?.clientId) return;
    let cancelled = false;
    initializeMsalClient()
      .then(() => {
        if (!cancelled) setMsalReady(true);
      })
      .catch(() => {
        if (!cancelled) setMsalReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isMicrosoftConfigured = Boolean(microsoftAuthConfig?.clientId) && msalReady;

  const validateProfile = () => {
    const errors: Record<string, string> = {};
    if (!localProfile.firstName.trim()) errors.firstName = "First name is required.";
    if (!localProfile.lastName.trim()) errors.lastName = "Last name is required.";
    if (!localProfile.email.trim()) {
      errors.email = "Email is required.";
    } else if (!localProfile.email.includes("@")) {
      errors.email = "Enter a valid email.";
    }
    return errors;
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const errors = validateProfile();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      const payload: Record<string, string> = {
        first_name: localProfile.firstName.trim(),
        last_name: localProfile.lastName.trim()
      };
      if (localProfile.phone?.trim()) payload.phone = localProfile.phone.trim();
      await api.patch("/api/users/me", payload);
      if (avatarFile) {
        // BF_PORTAL_AVATAR_FIX_v1 — send a downscaled data URL as profileImage (JSON).
        const profileImage = await fileToAvatarDataUrl(avatarFile);
        await api.patch("/api/users/me", { profileImage });
      }
      await fetchProfile();
      // BF_PORTAL_AVATAR_PREVIEW_v1 — pull the stored avatar back so the preview persists after save.
      if (avatarFile) {
        try {
          const me2 = await api.get<MeResponse>("/api/users/me");
          setLocalProfile((prev) => ({ ...prev, profileImage: me2?.profile_image_url ?? prev.profileImage }));
        } catch { /* keep local preview */ }
      }
      setStatusMessage("Profile updated");
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to save profile."));
    }
  };

  const onLoadProfile = async () => {
    setFormError(null);
    try {
      await fetchProfile();
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to load profile details."));
    }
  };

  const loadImage = (file: File) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Unable to read image."));
        image.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Unable to read file."));
      reader.readAsDataURL(file);
    });

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_AVATAR_SIZE_BYTES) {
        setAvatarError("Avatar must be under 2MB.");
        return;
      }
      try {
        const image = await loadImage(file);
        const squareSize = Math.min(image.width, image.height);
        const cropX = (image.width - squareSize) / 2;
        const cropY = (image.height - squareSize) / 2;
        const outputSize = Math.min(squareSize, MAX_AVATAR_DIMENSION);
        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Unable to prepare image preview.");
        }
        context.drawImage(image, cropX, cropY, squareSize, squareSize, 0, 0, outputSize, outputSize);
        const previewUrl = canvas.toDataURL("image/png");
        setLocalProfile((prev) => ({ ...prev, profileImage: previewUrl }));
        setAvatarFile(file);
        setAvatarError(null);
      } catch (error) {
        logger.error("Profile settings update failed", { error });
        setAvatarError("Unable to process that image. Please try a different file.");
      }
    }
  };

  const exchangeMicrosoftToken = useCallback(
    async (accessToken: string, accountEmail?: string | null) => {
      const payload = {
        accessToken,
        accountEmail: accountEmail ?? undefined
      };
      bfLogMsalPhase("exchange.start", { accountEmail: accountEmail ?? null });
      const exchange = await api.post<{ email?: string; connected?: boolean }>("/api/auth/microsoft", payload);
      bfLogMsalPhase("exchange.result", { connected: exchange?.connected ?? true, email: exchange?.email ?? accountEmail ?? null });
      const connectedEmail = exchange?.email ?? accountEmail ?? "";
      setMicrosoftConnection({ connected: true, email: connectedEmail });
      await fetchProfile();
    },
    [fetchProfile, setMicrosoftConnection]
  );

  useEffect(() => {
    if (!microsoftAuthConfig?.clientId || !msalReady) return;
    let isMounted = true;
    const handleRedirect = async () => {
      if (redirectHandledRef.current) return;
      redirectHandledRef.current = true;
      try {
        bfLogMsalPhase("handleRedirectPromise.start");
        const response = await msalClient.handleRedirectPromise();
        bfLogMsalPhase("handleRedirectPromise.result", { hadResult: Boolean(response), account: response?.account?.username ?? null });
        if (!response) return;
        if (!isMounted) return;
        setIsLinkingMicrosoft(true);
        const tokenResponse = response.accessToken
          ? response
          : await msalClient.acquireTokenSilent({
              scopes: microsoftAuthConfig.scopes,
              account: response.account ?? undefined
            });
        await exchangeMicrosoftToken(tokenResponse.accessToken, response.account?.username);
        bfLogMsalPhase("exchange.completed", {
          account: response.account?.username ?? null,
          authTokenPresent: typeof localStorage !== "undefined" ? Boolean(localStorage.getItem("auth_token")) : null
        });
      } catch (error) {
        if (!isMounted) return;
        bfLogMsalPhase("handleRedirectPromise.error", { message: (error as Error)?.message ?? "unknown" });
        setMicrosoftError(getErrorMessage(error as Error, "Microsoft sign-in failed."));
      } finally {
        if (isMounted) {
          setIsLinkingMicrosoft(false);
        }
      }
    };
    void handleRedirect();
    return () => {
      isMounted = false;
    };
  }, [exchangeMicrosoftToken, msalReady]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const msal = (window as any).msalInstance;
        if (!msal) return;
        const accounts = msal.getAllAccounts?.() ?? [];
        if (!accounts.length) return;
        const result = await msal.acquireTokenSilent({
          scopes: [
            "User.Read",
            "Mail.Send",
            "Mail.ReadWrite",
            "Mail.Send.Shared",
            "Calendars.ReadWrite",
            "Tasks.ReadWrite",
            "offline_access",
          ],
          account: accounts[0],
        });
        if (cancelled) return;
        if (result?.accessToken) {
          await api.post("/api/users/me/o365-tokens", {
            access_token: result.accessToken,
            refresh_token: (result as any)?.refreshToken ?? null,
            expires_in: result.expiresOn
              ? Math.max(0, Math.floor((result.expiresOn.getTime() - Date.now()) / 1000))
              : null,
            account_id: accounts[0]?.homeAccountId ?? null,
          });
        }
      } catch {
        // silent — server-side refresh endpoint will be tried on next API failure
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void api.post("/api/users/me/o365-refresh", {}).catch(() => {});
    }, 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleMicrosoftConnect = async () => {
    if (!microsoftAuthConfig?.clientId || !msalReady || isLinkingMicrosoft) return;
    setMicrosoftError(null);
    setIsLinkingMicrosoft(true);
    try {
      if (pickLoginStrategy() === "redirect") {
        bfLogMsalPhase("loginRedirect.start", { source: "profile-settings" });
        await msalClient.loginRedirect({
          scopes: microsoftAuthConfig.scopes
        });
        return;
      }

      bfLogMsalPhase("loginPopup.start", { source: "profile-settings" });
      const response = await msalClient.loginPopup({
        scopes: microsoftAuthConfig.scopes
      });
      const tokenResponse = response.accessToken
        ? response
        : await msalClient.acquireTokenSilent({
            scopes: microsoftAuthConfig.scopes,
            account: response.account ?? undefined
          });
      await exchangeMicrosoftToken(tokenResponse.accessToken, response.account?.username);
    } catch (error) {
      const authError = error as Error;
      const isSilentFailure =
        error instanceof BrowserAuthError &&
        ["popup_window_error", "empty_window_error", "monitor_window_timeout"].includes(error.errorCode);
      if (isSilentFailure) {
        setHideMicrosoftButton(true);
        if (pickLoginStrategy() === "redirect") {
          try {
            await msalClient.loginRedirect({ scopes: microsoftAuthConfig.scopes });
            return;
          } catch (redirectError) {
            setMicrosoftError(getErrorMessage(redirectError as Error, "Microsoft sign-in failed."));
          }
        }
      }
      setMicrosoftError(getErrorMessage(authError, "Microsoft sign-in failed."));
    } finally {
      setIsLinkingMicrosoft(false);
    }
  };

  const displayName = [localProfile.firstName, localProfile.lastName].filter(Boolean).join(" ").trim();
  const microsoftDisabledReason = !isMicrosoftConfigured
    ? "Microsoft OAuth is not configured."
    : hideMicrosoftButton
      ? "Microsoft sign-in requires a pop-up or redirect."
      : isLinkingMicrosoft
        ? "Microsoft sign-in is in progress."
        : "";

  return (
    <form className="settings-panel" onSubmit={onSave} aria-label="Profile settings">
      <header>
        <h2>My profile</h2>
        <p>Update your name, phone, and avatar. OAuth connections open in a new window.</p>
      </header>
      <ThemeToggle />
      {formError && <ErrorBanner message={formError} />}
      {microsoftError && <ErrorBanner message={microsoftError} />}

      <div className="profile-summary">
        <div>
          <p className="ui-field__label">Signed in as</p>
          <div className="profile-summary__name">{displayName || user?.name || "—"}</div>
          <div className="profile-summary__email">{localProfile.email}</div>
          <div className="profile-summary__email">
            Last login: {localProfile.lastLogin ? new Date(localProfile.lastLogin).toLocaleString() : "Unavailable"}
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <UserDetailsFields
          firstName={localProfile.firstName}
          lastName={localProfile.lastName}
          email={localProfile.email}
          phone={localProfile.phone}
          errors={formErrors}
          onChange={(updates) => setLocalProfile((prev) => ({ ...prev, ...updates }))}
        />
      </div>

      {/* BF_PORTAL_BLOCK_v609_FOUR_FIXES_v1 — email signature editor.
          GET/PUT /api/o365/me/signature (server-side shipped in v635). */}
      <EmailSignaturePanel />
      <SharedMailboxSignaturePanel /> {/* BF_PORTAL_BLOCK_v826_PER_MAILBOX_SIGNATURE_UI */}

      {/* BF_PORTAL_BLOCK_v694_COMMS — per-user booking URL.
          GET/PUT /api/o365/me/booking-url (server v693). */}
      <BookingUrlPanel />

      <div className="avatar-upload">
        <div>
          <p className="ui-field__label">Profile image</p>
          {localProfile.profileImage && (
            <img src={localProfile.profileImage} alt="Profile preview" className="avatar-preview" />
          )}
        </div>
        <div className="avatar-actions">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={onFileChange}
            aria-label="Upload profile image"
          />
          <p className="avatar-helper">Square crop enforced, max 256×256px, 2MB limit.</p>
          {avatarError && <p className="ui-field__error">{avatarError}</p>}
        </div>
      </div>

      <div className="connected-accounts">
        <h3>Connected accounts</h3>
        <p>Connect optional services. OAuth prompts open in a new window.</p>
        <div className="connected-accounts__actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleMicrosoftConnect}
            disabled={!isMicrosoftConfigured || isLinkingMicrosoft || hideMicrosoftButton}
            title={
              !isMicrosoftConfigured || isLinkingMicrosoft || hideMicrosoftButton
                ? microsoftDisabledReason
                : undefined
            }
          >
            {profile.microsoftConnected ? `✓ Connected: ${profile.microsoftAccountEmail ?? localProfile.email}` : "Connect Microsoft 365"}
          </Button>
          {/* v_O365_OAUTH_v1 - durable server-side connect: captures a refresh token so
              email stays connected (no more daily reconnects). */}
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              try {
                const r = await api.get<{ url?: string }>("/api/o365-oauth/start");
                if (r?.url) window.location.href = r.url;
                else setMicrosoftError("Could not start Microsoft connection.");
              } catch {
                setMicrosoftError("Could not start Microsoft connection.");
              }
            }}
            title="Connect once and stay connected (recommended)"
          >
            Stay connected (recommended)
          </Button>
          {!isMicrosoftConfigured && (
            <span className="text-xs text-slate-500">Microsoft OAuth is not configured.</span>
          )}
          {hideMicrosoftButton && (
            <span className="text-xs text-amber-600">
              Microsoft sign-in needs a popup or redirect. Use a browser that allows pop-ups.
            </span>
          )}
          {profile.microsoftConnected && (
            <Button type="button" variant="ghost" onClick={() => setMicrosoftConnection({ connected: false, email: undefined })}>Disconnect</Button>
          )}
          {!hideMicrosoftButton && isLinkingMicrosoft && (
            <span className="text-xs text-slate-500">Connecting…</span>
          )}
        </div>
      </div>

      <section style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #eaf0f6" }}>
        <h3 style={{ marginTop: 0 }}>Passkeys</h3>
        <p style={{ color: "#516f90", fontSize: 13, marginBottom: 12 }}>
          Sign in faster with Face ID, Touch ID, or your device PIN instead of a texted code.
          Passkeys sync across your Apple devices via iCloud Keychain.
        </p>
        {passkeysSupported() ? (
          <button
            type="button"
            data-testid="passkey-register-button"
            onClick={async () => {
              setPasskeyStatus(null);
              try {
                await registerPasskey();
                setPasskeyStatus("Passkey added. You can now sign in with it.");
              } catch (e: any) {
                if (e?.name !== "NotAllowedError" && e?.name !== "AbortError") {
                  setPasskeyStatus("Could not add a passkey. Please try again.");
                }
              }
            }}
            style={{ padding: "8px 16px", background: "var(--ui-accent-blue)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            Set up a passkey
          </button>
        ) : (
          <span style={{ fontSize: 13, color: "#516f90" }}>This browser doesn&apos;t support passkeys.</span>
        )}
        {passkeyStatus && <p style={{ marginTop: 10, fontSize: 13, color: "#516f90" }}>{passkeyStatus}</p>}
      </section>

      <section style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #eaf0f6" }}>
        <h3 style={{ marginTop: 0 }}>Push notifications</h3>
        <p style={{ color: "#516f90", fontSize: 13, marginBottom: 12 }}>
          Get notified about new SMS, application updates, and Maya escalations.
        </p>
        <button
          type="button"
          onClick={async () => {
            // BF_PORTAL_PUSH_REGISTER_v1 -- request permission, create a push subscription, and register it with the server.
            if (!("Notification" in window)) {
              alert("This browser does not support notifications.");
              return;
            }
            const result = await Notification.requestPermission();
            if (result !== "granted") {
              alert("Notifications were not enabled.");
              return;
            }
            try {
              if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                alert("Notifications enabled, but this browser cannot receive push messages.");
                return;
              }
              const reg = await navigator.serviceWorker.ready;
              let sub = await reg.pushManager.getSubscription();
              if (!sub) {
                const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
                if (!vapidKey) {
                  alert("Notifications enabled, but push is not configured for this environment yet.");
                  return;
                }
                const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
                const normalized = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
                const rawKey = window.atob(normalized);
                const appKey = new Uint8Array(rawKey.length);
                for (let i = 0; i < rawKey.length; i += 1) appKey[i] = rawKey.charCodeAt(i);
                sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
              }
              const json = sub.toJSON() as unknown as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
              if (json.endpoint && json.keys && json.keys.p256dh && json.keys.auth) {
                const deviceType = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop";
                await api.post("/api/pwa/subscribe", {
                  endpoint: json.endpoint,
                  keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
                  deviceType,
                });
              }
              alert("Notifications enabled.");
            } catch {
              alert("Notifications enabled, but push registration failed. Please try again.");
            }
          }}
          style={{
            padding: "8px 16px", background: "var(--ui-accent-blue)", color: "#fff",
            border: "none", borderRadius: 4, cursor: "pointer",
          }}
        >
          Enable notifications
        </button>
      </section>

      <OutOfOfficePanel />
      <OneDriveFilePicker />

      <div className="settings-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onLoadProfile}
          disabled={isLoadingProfile}
          title={isLoadingProfile ? "Profile is refreshing." : undefined}
        >
          {isLoadingProfile ? "Refreshing..." : "Refresh profile"}
        </Button>
        <Button
          type="submit"
          disabled={isLoadingProfile}
          title={isLoadingProfile ? "Profile is saving." : undefined}
        >
          {isLoadingProfile ? "Saving..." : "Save changes"}
        </Button>
        {statusMessage && <span role="status">{statusMessage}</span>}
      </div>
    </form>
  );
};


// BF_PORTAL_BLOCK_v609_FOUR_FIXES_v1 — minimal email-signature editor.
function EmailSignaturePanel() {
  const [html, setHtml] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<{ signatureHtml?: string }>("/api/o365/me/signature")
      .then((r) => { if (!cancelled) { setHtml(r?.signatureHtml ?? ""); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      await api.put("/api/o365/me/signature", { signatureHtml: html });
      setStatus("Saved.");
    } catch (e) {
      setStatus(getErrorMessage(e, "Save failed."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-grid" style={{ marginTop: 16 }}>
      <div style={{ width: "100%" }}>
        <h3 style={{ margin: "0 0 8px 0" }}>Email signature</h3>
        <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#6b7280" }}>
          Paste HTML or plain text. Appended to outbound emails sent via Boreal.
        </p>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={8}
          disabled={!loaded}
          aria-label="Email signature HTML"
          placeholder={loaded ? "<p>Best,<br>Your Name<br>Boreal Financial</p>" : "Loading…"}
          style={{ width: "100%", padding: 8, fontFamily: "monospace", fontSize: 12, borderRadius: 6, border: "1px solid var(--ui-border)" }}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <Button type="button" onClick={() => void save()} disabled={!loaded || saving}>
            {saving ? "Saving…" : "Save signature"}
          </Button>
          {status && <span style={{ fontSize: 13, color: status === "Saved." ? "#0d9b6c" : "#b00020" }}>{status}</span>}
        </div>
      </div>
    </div>
  );
}


// BF_PORTAL_BLOCK_v826_PER_MAILBOX_SIGNATURE_UI — per shared-mailbox signature.
// Emails sent AS a shared mailbox use the mailbox's own signature (server v824).
function SharedMailboxSignaturePanel() {
  const [shared, setShared] = useState<Array<{ address: string; display_name: string }>>([]);
  const [address, setAddress] = useState<string>("");
  const [html, setHtml] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Load the shared mailboxes the staff member can send as.
  useEffect(() => {
    let cancelled = false;
    api.get<{ mine: unknown; shared: Array<{ address: string; display_name: string }> }>("/api/crm/shared-mailboxes")
      .then((r) => {
        if (cancelled) return;
        const list = Array.isArray(r?.shared) ? r.shared : [];
        setShared(list);
        if (list[0]) setAddress(list[0].address);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  // Load the selected mailbox's signature.
  useEffect(() => {
    if (!address) { setHtml(""); return; }
    let cancelled = false;
    setStatus(null);
    api.get<{ signature_html?: string }>(`/api/crm/shared-mailboxes/${encodeURIComponent(address)}/signature`)
      .then((r) => { if (!cancelled) setHtml(r?.signature_html ?? ""); })
      .catch(() => { if (!cancelled) setHtml(""); });
    return () => { cancelled = true; };
  }, [address]);

  async function save() {
    if (!address) return;
    setSaving(true); setStatus(null);
    try {
      await api.put(`/api/crm/shared-mailboxes/${encodeURIComponent(address)}/signature`, { signature_html: html });
      setStatus("Saved.");
    } catch (e) {
      setStatus(getErrorMessage(e, "Save failed."));
    } finally {
      setSaving(false);
    }
  }

  if (loaded && shared.length === 0) return null; // no shared mailboxes -> hide panel

  return (
    <div className="settings-grid" style={{ marginTop: 16 }}>
      <div style={{ width: "100%" }}>
        <h3 style={{ margin: "0 0 8px 0" }}>Shared mailbox signature</h3>
        <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#6b7280" }}>
          Each shared mailbox has its own signature, used when you send email as that account.
        </p>
        <select
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={!loaded}
          aria-label="Shared mailbox"
          style={{ marginBottom: 8, padding: 6, borderRadius: 6, border: "1px solid var(--ui-border)", fontSize: 13 }}
        >
          {shared.map((m) => (
            <option key={m.address} value={m.address}>{m.display_name} ({m.address})</option>
          ))}
        </select>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={8}
          disabled={!loaded || !address}
          aria-label="Shared mailbox signature HTML"
          placeholder="<p>Boreal Financial<br>submissions@boreal.financial</p>"
          style={{ width: "100%", padding: 8, fontFamily: "monospace", fontSize: 12, borderRadius: 6, border: "1px solid var(--ui-border)" }}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <Button type="button" onClick={() => void save()} disabled={!loaded || !address || saving}>
            {saving ? "Saving…" : "Save signature"}
          </Button>
          {status && <span style={{ fontSize: 13, color: status === "Saved." ? "#0d9b6c" : "#b00020" }}>{status}</span>}
        </div>
      </div>
    </div>
  );
}


// BF_PORTAL_BLOCK_v694_COMMS — per-user booking URL editor.
function BookingUrlPanel() {
  const [bookingUrl, setBookingUrl] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<{ bookingUrl?: string | null; booking_url?: string | null }>("/api/o365/me/booking-url")
      .then((response) => {
        if (!cancelled) {
          setBookingUrl(response?.bookingUrl ?? response?.booking_url ?? "");
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      await api.put("/api/o365/me/booking-url", { bookingUrl: bookingUrl.trim() || null });
      setStatus("Saved.");
    } catch (error) {
      setStatus(getErrorMessage(error, "Save failed."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-grid" style={{ marginTop: 16 }}>
      <div style={{ width: "100%" }}>
        <h3 style={{ margin: "0 0 8px 0" }}>Booking URL</h3>
        <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#6b7280" }}>
          Store your scheduling link so the Microsoft 365 composer can insert it into outbound messages.
        </p>
        <input
          type="url"
          value={bookingUrl}
          onChange={(event) => setBookingUrl(event.target.value)}
          disabled={!loaded}
          aria-label="Booking URL"
          placeholder={loaded ? "https://calendly.com/your-name/intro" : "Loading…"}
          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--ui-border)" }}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <Button type="button" onClick={() => void save()} disabled={!loaded || saving}>
            {saving ? "Saving…" : "Save booking URL"}
          </Button>
          {status && <span style={{ fontSize: 13, color: status === "Saved." ? "#0d9b6c" : "#b00020" }}>{status}</span>}
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
