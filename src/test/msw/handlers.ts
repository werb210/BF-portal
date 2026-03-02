import { http, HttpResponse } from "msw";
import authMeFixture from "@/test/fixtures/auth-me.json";
import healthFixture from "@/test/fixtures/health.json";
import featureFlagsFixture from "@/test/fixtures/feature-flags.json";
import crmCountsFixture from "@/test/fixtures/crm-counts.json";

const lendersFixture = [
  {
    id: "l-1",
    name: "Northwind Capital",
    status: "ACTIVE",
    active: true,
    country: "US",
    primaryContact: {
      name: "Alex Agent",
      email: "alex@example.com",
      phone: "+1 555 111 3333",
      mobilePhone: "+1 555 111 4444"
    }
  }
];

const lenderProductsFixture = [
  {
    id: "p-1",
    lenderId: "l-1",
    productName: "Term loan",
    category: "TERM_LOAN",
    country: "US",
    active: true
  }
];

export const handlers = [
  http.options("*/api/auth/me", () => new HttpResponse(null, { status: 204 })),
  http.options("*/api/audit/activity", () => new HttpResponse(null, { status: 204 })),

  http.get("*/health", () => HttpResponse.json(healthFixture, { status: 200 })),
  http.get("*/api/health", () => HttpResponse.json(healthFixture, { status: 200 })),
  http.get("*/api/_int/production-readiness", () => HttpResponse.json({ ready: true, ...healthFixture }, { status: 200 })),
  http.get("*/api/_int/routes", () => HttpResponse.json({ routes: [] }, { status: 200 })),
  http.get("*/api/config/feature-flags", () => HttpResponse.json(featureFlagsFixture, { status: 200 })),

  http.get("*/api/auth/me", () => HttpResponse.json(authMeFixture, { status: 200 })),
  http.post("*/api/auth/otp/start", () => new HttpResponse(null, { status: 204, headers: { "x-twilio-sid": "twilio-sid" } })),
  http.post("*/api/auth/otp/verify", () => HttpResponse.json({ accessToken: "access-token", refreshToken: "refresh-token" }, { status: 200 })),

  http.post("*/api/audit/activity", () => new HttpResponse(null, { status: 204 })),
  http.options("*/api/secure", () => new HttpResponse(null, { status: 204 })),
  http.get("*/api/secure", () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 })),

  http.get("*/api/crm/leads/count", () => HttpResponse.json({ count: crmCountsFixture.leads }, { status: 200 })),
  http.get("*/api/support/live/count", () => HttpResponse.json({ count: crmCountsFixture.liveSupport }, { status: 200 })),
  http.get("*/api/public/lender-count", () => HttpResponse.json({ count: lendersFixture.length }, { status: 200 })),

  http.get("*/api/analytics/campaign-revenue", () => HttpResponse.json([], { status: 200 })),
  http.get("*/api/analytics/commission-trend", () => HttpResponse.json([], { status: 200 })),
  http.get("*/api/analytics/revenue-summary", () =>
    HttpResponse.json(
      {
        totalFunded: 0,
        totalCommission: 0,
        avgCommissionPerDeal: 0,
        totalApplications: 0,
        fundedDeals: 0
      },
      { status: 200 }
    )),
  http.get("*/api/analytics/lender-performance", () => HttpResponse.json([], { status: 200 })),
  http.get("*/api/analytics/priority-leads", () => HttpResponse.json([], { status: 200 })),

  http.get("*/api/lenders", () => HttpResponse.json({ items: lendersFixture }, { status: 200 })),
  http.get("*/api/lenders/:id", ({ params }) =>
    HttpResponse.json(
      lendersFixture.find((lender) => lender.id === params.id) ?? lendersFixture[0],
      { status: 200 }
    )),
  http.post("*/api/lenders", () => HttpResponse.json({ id: "new-lender" }, { status: 201 })),
  http.patch("*/api/lenders/:id", ({ params }) => HttpResponse.json({ id: params.id }, { status: 200 })),

  http.get("*/api/lender-products", () => HttpResponse.json({ items: lenderProductsFixture }, { status: 200 })),
  http.get("*/api/lender-products/:id", ({ params }) =>
    HttpResponse.json(
      lenderProductsFixture.find((product) => product.id === params.id) ?? lenderProductsFixture[0],
      { status: 200 }
    )),
  http.post("*/api/lender-products", () => HttpResponse.json({ id: "new-product" }, { status: 201 })),
  http.put("*/api/lender-products/:id", ({ params }) => HttpResponse.json({ id: params.id }, { status: 200 })),
  http.get("*/api/lender-products/:id/requirements", () => HttpResponse.json({ items: [] }, { status: 200 })),
  http.post("*/api/lender-products/:id/requirements", () => HttpResponse.json({ id: "req-1" }, { status: 201 })),
  http.put("*/api/lender-products/:productId/requirements/:requirementId", ({ params }) =>
    HttpResponse.json({ id: params.requirementId }, { status: 200 })),
  http.delete("*/api/lender-products/:productId/requirements/:requirementId", () => new HttpResponse(null, { status: 204 })),

  http.get("*/api/client/lenders", () => HttpResponse.json({ lenders: [] }, { status: 200 })),
  http.get("*/api/client/lender-products", () => HttpResponse.json({ products: [] }, { status: 200 })),
  http.get("*/api/client/lender-products/:id/requirements", () => HttpResponse.json({ requirements: [] }, { status: 200 })),

  http.options("*/api/lender/company", () => new HttpResponse(null, { status: 204 })),
  http.options("*/api/lender/products", () => new HttpResponse(null, { status: 204 })),
  http.get("*/api/lender/company", () =>
    HttpResponse.json(
      {
        id: "company-1",
        name: "Test Lender Co",
        status: "active"
      },
      { status: 200 }
    )),
  http.get("*/api/lender/products", () =>
    HttpResponse.json(
      [
        {
          id: "product-1",
          name: "Term Loan",
          category: "term",
          active: true
        }
      ],
      { status: 200 }
    ))
];
