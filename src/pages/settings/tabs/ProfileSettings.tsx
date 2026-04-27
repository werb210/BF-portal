import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserAuthError } from "@azure/msal-browser";
import api from "@/api";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { useAuth } from "@/hooks/useAuth";
import { microsoftAuthConfig } from "@/config/microsoftAuth";
import { initializeMsalClient, msalClient } from "@/auth/msal";
import { useSettingsStore } from "@/state/settings.store";
import { getErrorMessage } from "@/utils/errors";
import UserDetailsFields from "../components/UserDetailsFields";
import { logger } from "@/utils/logger";
import { pickLoginStrategy } from "@/auth/msalLoginStrategy";

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
};

function normalizeMeProfile(data: MeResponse | null | undefined) {
  return {
    firstName: data?.first_name ?? data?.firstName ?? "",
    lastName: data?.last_name ?? data?.lastName ?? "",
    email: data?.email ?? "",
    phone: data?.phone ?? ""
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
          phone: normalized.phone || prev.phone
        }));
      } catch (error) {
        if (!isMounted) return;
        logger.warn("Unable to pre-populate profile name fields", { error });
      }
    };

    void loadNameFields();

    return () => {
      isMounted = false;
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
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        await api.patch("/api/users/me", formData);
      }
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
      const exchange = await api.post<{ email?: string; connected?: boolean }>("/api/auth/microsoft", payload);
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
        const response = await msalClient.handleRedirectPromise();
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
      } catch (error) {
        if (!isMounted) return;
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
        await msalClient.loginRedirect({
          scopes: microsoftAuthConfig.scopes
        });
        return;
      }

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
        <h3 style={{ marginTop: 0 }}>Push notifications</h3>
        <p style={{ color: "#516f90", fontSize: 13, marginBottom: 12 }}>
          Get notified about new SMS, application updates, and Maya escalations.
        </p>
        <button
          type="button"
          onClick={async () => {
            if (!("Notification" in window)) {
              alert("This browser does not support notifications.");
              return;
            }
            const result = await Notification.requestPermission();
            if (result === "granted") {
              alert("Notifications enabled.");
            } else {
              alert("Notifications were not enabled.");
            }
          }}
          style={{
            padding: "8px 16px", background: "#2563eb", color: "#fff",
            border: "none", borderRadius: 4, cursor: "pointer",
          }}
        >
          Enable notifications
        </button>
      </section>

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

export default ProfileSettings;
