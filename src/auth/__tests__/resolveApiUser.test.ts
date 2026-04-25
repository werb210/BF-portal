import { describe, expect, it } from "vitest";

import { resolveApiUser } from "@/auth/AuthContext";

describe("resolveApiUser", () => {
  it("maps snake_case names and silo/silos and builds name", () => {
    const result = resolveApiUser({
      id: "u1",
      role: "Admin",
      first_name: "Todd",
      last_name: "W",
      silo: "BF",
      silos: ["BF", "BI"],
    });

    expect(result).toMatchObject({
      id: "u1",
      role: "Admin",
      firstName: "Todd",
      lastName: "W",
      first_name: "Todd",
      last_name: "W",
      silo: "BF",
      silos: ["BF", "BI"],
      name: "Todd W",
    });
  });

  it("preserves camelCase firstName/lastName", () => {
    const result = resolveApiUser({ id: "u1", role: "Admin", firstName: "Todd", lastName: "Werboweski" });

    expect(result?.firstName).toBe("Todd");
    expect(result?.lastName).toBe("Werboweski");
    expect(result?.name).toBe("Todd Werboweski");
  });

  it("returns undefined name when no name fields are present", () => {
    const result = resolveApiUser({ id: "u1", role: "Admin", email: "t@x.com" });

    expect(result?.name).toBeUndefined();
  });

  it("returns silos as an empty array when silos is missing", () => {
    const result = resolveApiUser({ id: "u1", role: "Admin", first_name: "Todd", last_name: "W" });

    expect(result?.silos).toEqual([]);
  });
});
