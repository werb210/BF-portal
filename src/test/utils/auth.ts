import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";

export type TestRole = "Admin" | "Staff" | "Broker" | "Lender" | "Referrer";

export const mockAuthedUser = (role: TestRole = "Staff") => {
  const user = {
    id: "test-user",
    email: `${role.toLowerCase()}@example.com`,
    role
  };

  localStorage.setItem("portal_access_token", "test-token");
  localStorage.setItem("portal_refresh_token", "test-refresh-token");

  server.use(
    http.get("*/api/auth/me", () => HttpResponse.json(user, { status: 200 }))
  );

  return user;
};
