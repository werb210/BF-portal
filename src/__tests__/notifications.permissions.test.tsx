// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { useNotificationPermissionPrompt } from "@/hooks/useNotificationPermissionPrompt";

const TestPrompt = () => {
  useNotificationPermissionPrompt();
  return null;
};

describe("notification permission prompt", () => {
  const originalNotification = window.Notification;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "Notification", {
      writable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("denied")
      }
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    Object.defineProperty(window, "Notification", {
      writable: true,
      value: originalNotification
    });
    localStorage.clear();
  });

  it("requests permission after authentication", async () => {
    renderWithProviders(<TestPrompt />, {
      auth: {
        user: { id: "u-11", email: "admin@example.com", role: "Admin" },
        authState: "authenticated",
        authStatus: "authenticated",
        rolesStatus: "resolved",
        authenticated: true,
        authReady: true
      }
    });

    expect(window.Notification.requestPermission).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });

    expect(window.Notification.requestPermission).toHaveBeenCalledTimes(1);
  });
});
