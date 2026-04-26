/* @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// Stub everything App pulls in beyond what we're testing — keep this surface tiny.
vi.mock("@/auth/AuthContext", () => ({
  AuthProvider: ({ children }: any) => <>{children}</>,
  useAuth: () => ({ token: null, role: null }),
}));
vi.mock("@/auth/portalSessionGuard", () => ({ usePortalSessionGuard: () => undefined }));
vi.mock("@/dialer/useServerCallSync", () => ({ useServerCallSync: () => undefined }));
vi.mock("@/telephony/bootstrapVoice", () => ({
  bootstrapVoice: vi.fn(), destroyVoiceDevice: vi.fn(),
}));
vi.mock("@/lib/o365TokenRefresh", () => ({ refreshO365TokenIfPossible: vi.fn() }), { virtual: true });
vi.mock("@/auth/sanitizeOtpFlowState", () => ({ sanitizeOtpFlowStateOnBoot: vi.fn() }), { virtual: true });

// Force the install hook to report installable
vi.mock("@/hooks/useInstallPrompt", () => ({
  useInstallPrompt: () => ({
    canInstall: true,
    promptInstall: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/components/ui/Button", () => ({
  default: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}));

import InstallPromptBanner from "@/components/InstallPromptBanner";

describe("InstallPromptBanner mount", () => {
  it("renders the install CTA when the install event has been captured", () => {
    render(
      <MemoryRouter>
        <InstallPromptBanner />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: /install app/i })).toBeInTheDocument();
    expect(screen.getByText(/staff portal/i)).toBeInTheDocument();
  });
});
