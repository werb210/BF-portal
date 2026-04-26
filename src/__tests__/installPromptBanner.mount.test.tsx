/* @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// vi.mock signature is (path, factory) — no 3rd options arg in vitest.
// Force the install hook to report installable.
vi.mock("@/hooks/useInstallPrompt", () => ({
  useInstallPrompt: () => ({
    canInstall: true,
    promptInstall: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

// Stub the design-system Button so the test doesn't drag in unrelated deps.
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
