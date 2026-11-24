// BF_PORTAL_DROPOFF_FIELD_LABELS_v1
import { describe, expect, it } from "vitest";
import { fieldLabel } from "../GoogleAdsAnalytics";

describe("drop-off field labels", () => {
  it("turns ids and placeholders into readable names", () => {
    expect(fieldLabel("step1-lookingFor")).toBe("Looking for");
    expect(fieldLabel("step3-startDate")).toBe("Start date");
    expect(fieldLabel("12-3456789")).toBe("Business number");
    expect(fieldLabel("$")).toBe("Unlabelled field");
    expect(fieldLabel("field")).toBe("Unlabelled field");
    expect(fieldLabel("Type your full legal name")).toBe("Type your full legal name");
  });
});
