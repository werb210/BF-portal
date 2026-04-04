import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
export const mockAuthedUser = (role = "Staff") => {
    const user = {
        id: "test-user",
        email: `${role.toLowerCase()}@example.com`,
        role
    };
    sessionStorage.setItem("bf_token", "test-token");
    server.use(http.get("*/api/auth/me", () => HttpResponse.json(user, { status: 200 })));
    return user;
};
