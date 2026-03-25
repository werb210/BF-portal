import { http, HttpResponse } from "msw";

export const handlers = [

  // LENDERS
  http.get("/lenders", () => {
    return HttpResponse.json([
      { id: "1", name: "Test Lender" }
    ]);
  }),

  // LENDER PRODUCTS
  http.get("/lender-products", () => {
    return HttpResponse.json([
      {
        id: "1",
        lender: "Test Lender",
        name: "LOC",
        type: "Line of Credit",
        min: 10000,
        max: 500000
      }
    ]);
  }),

  // CALENDAR EVENTS
  http.get("/local-events", () => {
    return HttpResponse.json([
      {
        id: "1",
        title: "Test Task",
        date: "2025-01-01",
        contactId: "1",
        applicationId: "1"
      }
    ]);
  }),

  // AUTH / ROLES
  http.get("/me", () => {
    return HttpResponse.json({
      id: "1",
      roles: ["Admin"]
    });
  }),

  // GENERIC FALLBACK (optional safety)
  http.get("*", () => {
    return HttpResponse.json([]);
  }),
];
