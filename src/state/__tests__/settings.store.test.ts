import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock("@/api", () => ({
  default: {
    get: apiGetMock,
  },
}));

import { normalizeAdminUser, useSettingsStore } from "@/state/settings.store";

describe("settings.store admin user normalization", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      users: [],
      statusMessage: undefined,
      isLoadingUsers: false,
    });
    apiGetMock.mockReset();
  });

  it("normalizeAdminUser maps snake_case names to camelCase", () => {
    const result = normalizeAdminUser({ first_name: "Todd", last_name: "W" });

    expect(result).toEqual({
      first_name: "Todd",
      last_name: "W",
      firstName: "Todd",
      lastName: "W",
      silos: [],
    });
  });

  it("normalizeAdminUser preserves existing camelCase firstName", () => {
    const result = normalizeAdminUser({ firstName: "Thomas", first_name: "Todd", last_name: "W" });

    expect(result.firstName).toBe("Thomas");
    expect(result.lastName).toBe("W");
  });

  it("fetchUsers stores both firstName and first_name from snake_case response", async () => {
    apiGetMock.mockResolvedValueOnce([
      { id: "1", first_name: "Todd", last_name: "W", email: "t@x.com", role: "Admin" },
    ]);

    await useSettingsStore.getState().fetchUsers();

    const user = useSettingsStore.getState().users[0];
    expect(user.firstName).toBe("Todd");
    expect(user.first_name).toBe("Todd");
    expect(user.lastName).toBe("W");
  });
});
