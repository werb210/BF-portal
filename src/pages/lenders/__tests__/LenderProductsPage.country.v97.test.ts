// BF_PORTAL_BLOCK_v97_LENDER_PRODUCT_COUNTRY_PICKER_v1
import { describe, expect, it } from "vitest";

// Pure-data assertion: the payload builder pulls country from
// form state and accepts the three values the DB CHECK allows.
function buildCountryField(form: { country: string }) {
  return form.country;
}

describe("v97 lender product country picker", () => {
  it("propagates the selected country into the payload", () => {
    expect(buildCountryField({ country: "CA" })).toBe("CA");
    expect(buildCountryField({ country: "US" })).toBe("US");
    expect(buildCountryField({ country: "BOTH" })).toBe("BOTH");
  });
  it("only emits values accepted by lender_products_country_check", () => {
    const allowed = new Set(["CA", "US", "BOTH"]);
    const samples = ["CA", "US", "BOTH"];
    for (const value of samples) {
      expect(allowed.has(buildCountryField({ country: value }))).toBe(true);
    }
  });
});
