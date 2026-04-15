import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";

export type TestRole = "Admin" | "Staff" | "Lender" | "Referrer" | "Ops";

export const mockAuthedUser = (role: TestRole = "Staff") => {
  const user = {
    id: "test-user",
    email: `${role.toLowerCase()}@example.com`,
    role
  };

  sessionStorage.setItem("bf_token", "test-token");
  

  server.use(
    http.get("*/api/auth/me", () => HttpResponse.json(user, { status: 200 }))
  );

  return user;
};
