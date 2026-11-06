import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BrowserAuthError } from "@azure/msal-browser";
import api from "@/api";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import ThemeToggle from "@/components/settings/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { microsoftAuthConfig } from "@/config/microsoftAuth";
import { initializeMsalClient, msalClient } from "@/auth/msal";
import { useSettingsStore } from "@/state/settings.store";
import { getAuthToken } from "@/lib/authToken";
import { getErrorMessage } from "@/utils/errors";
import UserDetailsFields from "../components/UserDetailsFields";
import { logger } from "@/utils/logger";
import { bfLogMsalPhase, pickLoginStrategy } from "@/auth/msalLoginStrategy";
import { registerPasskey, passkeysSupported } from "@/auth/passkey"; // BF_PORTAL_WEBAUTHN_v1
import { FollowUpDefaults, MyLeadRotation } from "@/settingsPack/MyProfileExtras"; // BF_PORTAL_v869_SETTINGS_PACK
import { MySessions } from "@/settingsPack/SecuritySettings"; // BF_PORTAL_v909_PROFILE_TABS
import { MyQueueAvailability } from "@/callQueues/CallQueuesSettings"; // BF_PORTAL_v909_PROFILE_TABS
import { publishMyAvatar } from "@/components/ui/UserAvatar"; // BF_PORTAL_v909_AVATARS
import OutOfOfficePanel from "@/components/o365/OutOfOfficePanel"; // BF_PORTAL_O365_UI_v1
import ContactsSyncButton from "@/components/o365/ContactsSyncButton"; // BF_PORTAL_CONTACTS_PULL_TRIGGER_v1
import SignatureBuilder from "@/components/signature/SignatureBuilder"; // BF_PORTAL_v864_SIGNATURE_BUILDER
import { SILO_BRANDS, type SignatureFields } from "@/components/signature/signatureHtml"; // BF_PORTAL_v864_SIGNATURE_BUILDER
import SiloContext from "@/context/SiloContext"; // BF_PORTAL_v864_SIGNATURE_BUILDER
import { registerExistingPushPermission } from "@/hooks/usePushRegistration";

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

function normalizeMeProfile(data: MeResponse | null | undefined) {
  return {
    firstName: data?.first_name ?? data?.firstName ?? "",
    lastName: data?.last_name ?? data?.lastName ?? "",
    email: data?.email ?? "",
    phone: data?.phone ?? "",
    profileImage: data?.profile_image_url ?? "" // BF_PORTAL_AVATAR_PREVIEW_v1
  };
}

// BF_PORTAL_v909_PROFILE_TABS
type ProfileTab = "profile" | "signature" | "booking" | "security" | "notifications";
const PROFILE_TABS: Array<[ProfileTab, string]> = [
  ["profile", "Profile & photo"],
  ["signature", "Email signature"],
  ["booking", "Booking & follow-ups"],
  ["security", "Devices & security"],
  ["notifications", "Notifications & out of office"],
];

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
  const [hideMicrosoftButton, setHideMicrosoftButton] = useState(false);
  const [msalReady, setMsalReady] = useState(false);
  const [passkeyStatus, setPasskeyStatus] = useState<string | null>(null);
  // BF_PORTAL_v909_PROFILE_TABS - My Profile in five parts instead of one long page.
  const [profileTab, setProfileTab] = useState<ProfileTab>("profile");
  const [avatarStatus, setAvatarStatus] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const isAdminUser = String((user as { role?: string } | null)?.role ?? "").toUpperCase() === "ADMIN";
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
  }, [setMicrosoftConnection]); // BF_PORTAL_v789_HOOK_DEPS - a store action, stable across renders

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
      // BF_PORTAL_v909_AVATARS - the photo is saved the moment it is chosen (onFileChange), not with this button.
      await fetchProfile();
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
        // BF_PORTAL_v909_AVATARS - "Upload does nothing": choosing a photo only changed the preview, and it was saved
        // only if Save changes was pressed afterwards (and then shown nowhere else). It is now saved straight away as a
        // small JPEG and shown in the top bar, the Team list and Team chat.
        const photo = canvas.toDataURL("image/jpeg", 0.85);
        setLocalProfile((prev) => ({ ...prev, profileImage: photo }));
        setAvatarError(null);
        setAvatarSaving(true);
        setAvatarStatus("Saving your photo…");
        try {
          await api.patch("/api/users/me", { profileImage: photo });
          publishMyAvatar(photo);
          setAvatarStatus("Photo saved.");
        } catch (err) {
          setAvatarStatus(null);
          setAvatarError(getErrorMessage(err, "Could not save the photo. Try a JPEG or PNG under 2 MB."));
        } finally {
          setAvatarSaving(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      } catch (error) {
        logger.error("Profile settings update failed", { error });
        setAvatarError("Unable to read that image. Choose a JPEG or PNG photo (iPhone HEIC photos may need to be exported as JPEG).");
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
          authTokenPresent: Boolean(getAuthToken())
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
      {formError && <ErrorBanner message={formError} />}
      {microsoftError && <ErrorBanner message={microsoftError} />}
      {/* BF_PORTAL_v909_PROFILE_TABS */}
      <div role="tablist" aria-label="My profile sections" data-testid="profile-tabs" style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0 16px" }}>
        {PROFILE_TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={profileTab === id} onClick={() => setProfileTab(id)}
            style={{ padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid var(--ui-border)", background: profileTab === id ? "#1e3a8a" : "var(--ui-surface-strong)", color: profileTab === id ? "#ffffff" : "var(--ui-text)" }}>
            {label}
          </button>
        ))}
      </div>

      {profileTab === "profile" && (<>
      <ThemeToggle />
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
            disabled={avatarSaving}
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            ref={fileInputRef}
            onChange={onFileChange}
            aria-label="Upload profile image"
          />
          <p className="avatar-helper">Choose a JPEG or PNG under 2 MB. It is cropped square and saved straight away; it shows in the top bar, the Team list and Team chat.</p>
          {avatarStatus && <p role="status" data-testid="avatar-status" style={{ fontSize: 13 }}>{avatarStatus}</p>}
          {localProfile.profileImage && (
            <button type="button" disabled={avatarSaving} onClick={async () => {
              setAvatarSaving(true); setAvatarError(null);
              try { await api.patch("/api/users/me", { profileImage: null }); setLocalProfile((prev) => ({ ...prev, profileImage: "" })); publishMyAvatar(null); setAvatarStatus("Photo removed."); }
              catch (err) { setAvatarError(getErrorMessage(err, "Could not remove the photo.")); }
              finally { setAvatarSaving(false); }
            }} style={{ marginTop: 6, padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer" }}>Remove photo</button>
          )}
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
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                // BF_PORTAL_V780 - forget the Microsoft connection on the server too, not just on screen.
                setMicrosoftError(null);
                try {
                  await api.post("/api/o365-oauth/disconnect", {});
                  setMicrosoftConnection({ connected: false, email: undefined });
                  void fetchProfile();
                } catch (err) {
                  setMicrosoftError(getErrorMessage(err as Error, "Could not disconnect Microsoft."));
                }
              }}
            >
              Disconnect
            </Button>
          )}
          {!hideMicrosoftButton && isLinkingMicrosoft && (
            <span className="text-xs text-slate-500">Connecting…</span>
          )}
        </div>
      </div>

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
      </>)}

      {profileTab === "signature" && (<>
      {/* BF_PORTAL_BLOCK_v609_FOUR_FIXES_v1 — email signature editor.
          GET/PUT /api/o365/me/signature (server-side shipped in v635). */}
      <EmailSignaturePanel />
      {/* BF_PORTAL_v893_PORTAL_FIXES - shared mailbox signatures are set by Admins; everyone else sets only their own. */}
      {isAdminUser ? <SharedMailboxSignaturePanel /> : <p data-testid="shared-signature-admin-only" style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Shared mailbox signatures (for example info@) are set by an Admin.</p>} {/* BF_PORTAL_BLOCK_v826_PER_MAILBOX_SIGNATURE_UI */}
      <ContactsSyncButton />
      </>)}

      {profileTab === "booking" && (<>
      {/* BF_PORTAL_BLOCK_v694_COMMS — per-user booking URL.
          GET/PUT /api/o365/me/booking-url (server v693). */}
      <BookingUrlPanel />
      <div data-testid="my-profile-extras">
        <FollowUpDefaults />
        <MyLeadRotation />
        <MyQueueAvailability compact />
      </div>
      </>)}

      {profileTab === "security" && (<>
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
                  // BF_PORTAL_v864_NATIVE_PASSKEYS - show the app's reason (e.g. the domain is not linked yet).
                  setPasskeyStatus(e?.name === "PasskeyNativeError" && e?.message ? `Could not add a passkey: ${e.message}` : "Could not add a passkey. Please try again.");
                }
              }
            }}
            style={{ padding: "8px 16px", background: "var(--ui-accent-blue)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            Set up a passkey
          </button>
        ) : (
          <span style={{ fontSize: 13, color: "#516f90" }}>
            {/* BF_PORTAL_v864_NATIVE_PASSKEYS - the old Electron Mac app has no passkey support; the native Mac app does. */}
            {typeof navigator !== "undefined" && /Electron/i.test(navigator.userAgent)
              ? "This version of the Mac app can't use passkeys. Install the new Boreal Staff Portal for Mac, or use the iPad app or a browser."
              : "This browser doesn't support passkeys."}
          </span>
        )}
        {passkeyStatus && <p style={{ marginTop: 10, fontSize: 13, color: "#516f90" }}>{passkeyStatus}</p>}
      </section>


      <MySessions />
      </>)}

      {profileTab === "notifications" && (<>
      <section style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #eaf0f6" }}>
        <h3 style={{ marginTop: 0 }}>Push notifications</h3>
        <p style={{ color: "#516f90", fontSize: 13, marginBottom: 12 }}>
          Get notified about new SMS, application updates, and Maya escalations.
        </p>
        <button
          type="button"
          onClick={async () => {
            // BF_PORTAL_PUSH_VAPID_ROTATE_v1 -- delegate subscription creation and stale-key rotation to the shared registrar.
            if (!("Notification" in window)) {
              alert("This browser does not support notifications.");
              return;
            }
            // BF_PORTAL_PUSH_ERR_v1 - iPhone/iPad only allow web push from the app added to the
            // Home Screen (not a Safari tab). Guide the user instead of failing cryptically.
            const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
            const isStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
            if (isIOS && !isStandalone) {
              alert("On iPhone/iPad, add Boreal Portal to your Home Screen first (Share button, then Add to Home Screen), open it from there, and then tap Enable notifications.");
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
              await registerExistingPushPermission();
              alert("Notifications enabled.");
            } catch (err) {
              const detail = err instanceof Error && err.message ? (" (" + err.message + ")") : "";
              alert("Notifications enabled, but push registration failed. Please try again." + detail);
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
      </>)}
    </form>
  );
};


// BF_PORTAL_v864_SIGNATURE_BUILDER - the company's brand for signatures: the logo saved in branding settings
// (else the business's default logo), its colour and website, for the business (silo) in use.
function useSignatureBrand(): Partial<SignatureFields> {
  const silo = useContext(SiloContext)?.silo; // no provider (tests, sign-in) -> Boreal Financial
  const key = String(silo ?? "BF").toUpperCase();
  const base = SILO_BRANDS[key] ?? SILO_BRANDS.BF ?? { company: "", color: "#1E3A8A", website: "", logoUrl: "" };
  const [logoUrl, setLogoUrl] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    api.get<{ branding?: { logoUrl?: string }; logoUrl?: string }>("/api/settings/branding")
      .then((r) => { if (!cancelled) setLogoUrl(String(r?.branding?.logoUrl ?? r?.logoUrl ?? "").trim()); })
      .catch((e) => { logger.warn("[signature] branding read failed", { message: getErrorMessage(e, "") }); });
    return () => { cancelled = true; };
  }, []);
  return useMemo(() => ({
    company: base.company,
    color: base.color,
    website: base.website,
    logoUrl: /^https:\/\//i.test(logoUrl) ? logoUrl : base.logoUrl,
  }), [base, logoUrl]);
}

// BF_PORTAL_BLOCK_v609_FOUR_FIXES_v1 — minimal email-signature editor.
// BF_PORTAL_v864_SIGNATURE_BUILDER - now a builder (brand logo + colour, your details, live preview) that writes
// email-safe table HTML; pasting your own HTML is the advanced option.
function EmailSignaturePanel() {
  const [html, setHtml] = useState<string>("");
  const [draft, setDraft] = useState<string>("");
  const [bookingUrl, setBookingUrl] = useState<string>("");
  const profile = useSettingsStore((st) => st.profile);
  const brand = useSignatureBrand();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<{ signatureHtml?: string }>("/api/o365/me/signature")
      .then((r) => { if (!cancelled) { setHtml(r?.signatureHtml ?? ""); setDraft(r?.signatureHtml ?? ""); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    api.get<{ bookingUrl?: string | null; booking_url?: string | null }>("/api/o365/me/booking-url")
      .then((r) => { if (!cancelled) setBookingUrl(String(r?.bookingUrl ?? r?.booking_url ?? "")); })
      .catch((e) => { logger.warn("[signature] booking link read failed", { message: getErrorMessage(e, "") }); });
    return () => { cancelled = true; };
  }, []);

  const defaults = useMemo<Partial<SignatureFields>>(() => ({
    ...brand,
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    bookingUrl,
  }), [brand, profile.firstName, profile.lastName, profile.email, profile.phone, bookingUrl]);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      await api.put("/api/o365/me/signature", { signatureHtml: draft });
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
        <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#475569" }}>
          Added to the emails you send from Boreal. Build it from your details and the company logo and colour, or paste your own HTML.
        </p>
        {loaded ? (
          <SignatureBuilder html={html} defaults={defaults} onChange={setDraft} label="Email signature" testIdPrefix="my-sig" />
        ) : (
          <p style={{ fontSize: 13, color: "#475569" }}>Loading…</p>
        )}
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
  const [draft, setDraft] = useState<string>(""); // BF_PORTAL_v864_SIGNATURE_BUILDER
  const brand = useSignatureBrand();
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
      .then((r) => { if (!cancelled) { setHtml(r?.signature_html ?? ""); setDraft(r?.signature_html ?? ""); } })
      .catch(() => { if (!cancelled) { setHtml(""); setDraft(""); } });
    return () => { cancelled = true; };
  }, [address]);

  // BF_PORTAL_v864_SIGNATURE_BUILDER - a shared mailbox signs as the mailbox: its name and address, the brand.
  const mailbox = shared.find((m) => m.address === address);
  const sharedDefaults = useMemo<Partial<SignatureFields>>(() => ({
    ...brand,
    name: mailbox?.display_name ?? "",
    email: address,
  }), [brand, mailbox?.display_name, address]);

  async function save() {
    if (!address) return;
    setSaving(true); setStatus(null);
    try {
      await api.put(`/api/crm/shared-mailboxes/${encodeURIComponent(address)}/signature`, { signature_html: draft });
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
        {address ? (
          <SignatureBuilder key={address} html={html} defaults={sharedDefaults} disabled={!loaded} onChange={setDraft} label="Shared mailbox signature" testIdPrefix="shared-sig" />
        ) : null}
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
