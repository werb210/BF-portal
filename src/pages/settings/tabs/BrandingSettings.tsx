import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useSettingsStore } from "@/state/settings.store";
import { getErrorMessage } from "@/utils/errors";

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];

const BrandingSettings = () => {
  const { branding, fetchBranding, saveBranding, statusMessage, isLoadingBranding } = useSettingsStore();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [localBranding, setLocalBranding] = useState(branding);
  const [formError, setFormError] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalBranding(branding);
  }, [branding]);

  useEffect(() => {
    let isMounted = true;
    fetchBranding().catch((error) => {
      if (!isMounted) return;
      setFormError(getErrorMessage(error, "Unable to load branding settings."));
    });
    return () => {
      isMounted = false;
    };
  }, [fetchBranding]);

  const handleLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setFormError("Logo must be a PNG, JPG, SVG, or WebP image.");
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setFormError("Logo must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const previewUrl = reader.result as string;
      setLocalBranding((prev) => ({ ...prev, logoUrl: previewUrl }));
      setFormError(null);
    };
    reader.onerror = () => setFormError("Unable to read the logo file.");
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    setFormError(null);
    setLocalMessage(null);
    try {
      await saveBranding(localBranding);
      setLocalMessage("Brand settings saved.");
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to save branding settings."));
    }
  };

  const onLoadBranding = async () => {
    setFormError(null);
    try {
      await fetchBranding();
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to load branding settings."));
    }
  };

  const logoPreviewStyle = useMemo(
    () => ({
      width: `${localBranding.logoWidth}px`
    }),
    [localBranding.logoWidth]
  );

  return (
    <section className="settings-panel" aria-label="Branding settings">
      <header>
        <h2>Branding</h2>
        <p>Upload a logo and size it for the portal header, emails, PDFs, and client apps.</p>
      </header>
      {formError && <div className="settings-inline-alert settings-inline-alert--error" role="alert">{formError}</div>}
      {localMessage && <div className="settings-inline-alert settings-inline-alert--success" role="status">{localMessage}</div>}

      <div className="branding-preview">
        <div className="branding-preview__left">
          <p className="ui-field__label">Logo preview</p>
          <div className="logo-preview__frame">
            {localBranding.logoUrl ? (
              <img
                src={localBranding.logoUrl}
                alt="Company logo preview"
                className="logo-preview"
                style={logoPreviewStyle}
              />
            ) : (
              <div className="ui-empty-state ui-empty-state--compact">
                <strong>No logo yet</strong>
                <p>Upload your company logo to preview it across the portal.</p>
              </div>
            )}
          </div>
        </div>
        <div className="branding-controls branding-preview__right">
          <label className="ui-field">
            <span className="ui-field__label">Logo size</span>
            <input
              type="range"
              min={120}
              max={360}
              step={10}
              value={localBranding.logoWidth}
              onChange={(event) =>
                setLocalBranding((prev) => ({
                  ...prev,
                  logoWidth: Number(event.target.value)
                }))
              }
              disabled={!isAdmin}
              aria-label="Resize logo"
            />
          </label>
          {isAdmin && (
            <label className="ui-field">
              <span className="ui-field__label">Upload logo</span>
              <input type="file" accept="image/*" onChange={handleLogo} aria-label="Upload logo" />
            </label>
          )}
          {!isAdmin && <p className="ui-field__helper">Admins can upload and resize the logo.</p>}
        </div>
      </div>

      <div className="settings-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onLoadBranding}
          disabled={isLoadingBranding}
          title={isLoadingBranding ? "Branding is refreshing." : undefined}
        >
          {isLoadingBranding ? "Refreshing..." : "Refresh branding"}
        </Button>
        {isAdmin && (
          <Button
            type="button"
            onClick={onSave}
            disabled={isLoadingBranding}
            title={isLoadingBranding ? "Branding is saving." : undefined}
          >
            {isLoadingBranding ? "Saving..." : "Save branding"}
          </Button>
        )}
        {statusMessage && <span role="status">{statusMessage}</span>}
      </div>
    </section>
  );
};

export default BrandingSettings;
