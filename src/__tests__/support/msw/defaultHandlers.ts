import { http, HttpResponse } from "msw";


export const defaultHandlers = [
  http.options("*/api/auth/me", () => new HttpResponse(null, { status: 204 })),
  http.options("*/api/audit/activity", () => new HttpResponse(null, { status: 204 })),

  http.get("*/health", () => HttpResponse.json({ status: "ok" })),
  http.get("*/api/health", () => HttpResponse.json({ status: "ok" })),
  http.get("*/api/crm/leads/count", () => HttpResponse.json({ count: 0 })),
  http.get("*/api/_int/production-readiness", () => HttpResponse.json({ ready: true, status: "ok" })),
  http.get("*/api/support/live/count", () => HttpResponse.json({ count: 0 })),
  http.get("*/api/public/lender-count", () => HttpResponse.json({ count: 0 })),
  http.get("*/api/auth/me", () => HttpResponse.json({ id: "u1", role: "Staff", email: "staff@example.com" })),
  http.post("*/api/auth/otp/start", () => new HttpResponse(null, { status: 204, headers: { "x-twilio-sid": "twilio-sid" } })),
  http.post("*/api/auth/otp/verify", () => HttpResponse.json({ accessToken: "access-token", refreshToken: "refresh-token" })),
  http.post("*/api/audit/activity", () => new HttpResponse(null, { status: 204 })),
  http.options("*/api/secure", () => new HttpResponse(null, { status: 204 })),
  http.options("http://localhost/api/secure", () => new HttpResponse(null, { status: 204 })),
  http.get("*/api/secure", () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 })),
  http.get("http://localhost/api/secure", () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 })),
  http.all(/.*\/api\/secure$/, ({ request }) =>
    request.method === "OPTIONS"
      ? new HttpResponse(null, { status: 204 })
      : HttpResponse.json({ message: "Unauthorized" }, { status: 401 })),
  http.options(/\/api\/secure$/, () => new HttpResponse(null, { status: 204 })),
  http.get(/\/api\/secure$/, () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 })),
  http.get("*/api/analytics/campaign-revenue", () => HttpResponse.json([])),
  http.get("*/api/analytics/commission-trend", () => HttpResponse.json([])),
  http.get("*/api/analytics/revenue-summary", () =>
    HttpResponse.json({
      totalFunded: 0,
      totalCommission: 0,
      avgCommissionPerDeal: 0,
      totalApplications: 0,
      fundedDeals: 0
    })),
  http.get("*/api/analytics/lender-performance", () => HttpResponse.json([])),
  http.get("*/api/analytics/priority-leads", () => HttpResponse.json([])),
  http.get("*/api/dialer/stats", () =>
    HttpResponse.json({
      totalCalls: 0,
      avgDurationSeconds: 0,
      missedCallPercent: 0,
      voicemailCount: 0,
      leaderboard: []
    })),
  http.get("*/api/dialer/calls", () => HttpResponse.json([])),

  http.get("*/api/client/lenders", () => HttpResponse.json({ lenders: [] })),
  http.get("*/api/client/lender-products", () => HttpResponse.json({ products: [] })),
  http.get("*/api/client/lender-products/:id/requirements", () => HttpResponse.json({ requirements: [] })),
  http.options("*/api/lender/company", () => new HttpResponse(null, { status: 204 })),
  http.options("*/api/lender/products", () => new HttpResponse(null, { status: 204 })),
  http.get("*/api/lender/company", () =>
    HttpResponse.json({
      id: "company-1",
      name: "Test Lender Co",
      status: "active"
    })),
  http.get("*/api/lender/products", () =>
    HttpResponse.json([
      {
        id: "product-1",
        name: "Term Loan",
        category: "term",
        active: true
      }
    ])),
  http.all(/.*\/api\/lender\/(company|products)$/, ({ request }) => {
    if (request.method === "OPTIONS") {
      return new HttpResponse(null, { status: 204 });
    }
    if (request.url.endsWith("/api/lender/company")) {
      return HttpResponse.json({ id: "company-1", name: "Test Lender Co", status: "active" });
    }
    return HttpResponse.json([{ id: "product-1", name: "Term Loan", category: "term", active: true }]);
  }),
  http.options(/\/api\/lender\/company$/, () => new HttpResponse(null, { status: 204 })),
  http.options(/\/api\/lender\/products$/, () => new HttpResponse(null, { status: 204 })),
  http.get(/\/api\/lender\/company$/, () =>
    HttpResponse.json({
      id: "company-1",
      name: "Test Lender Co",
      status: "active"
    })),
  http.get(/\/api\/lender\/products$/, () =>
    HttpResponse.json([
      {
        id: "product-1",
        name: "Term Loan",
        category: "term",
        active: true
      }
    ])),

  http.get("ws://localhost/ws", () => new HttpResponse("OK", { status: 200 })),
  http.get("ws://localhost/ws/chat", () => new HttpResponse("OK", { status: 200 }))
];
