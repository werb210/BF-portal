// PHONE_LEADING_ONE_v1 - a number typed with its leading 1 keeps all 10 digits.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { formatPhone } from "../format";
import PhoneInput from "@/components/forms/PhoneInput";

describe("leading 1 country code", () => {
  it("formatPhone drops the country code instead of the last digit", () => {
    expect(formatPhone("15406930536")).toBe("(540) 693-0536");
    expect(formatPhone("5406930536")).toBe("(540) 693-0536");
  });
  it("PhoneInput saves +15406930536 when 15406930536 is typed", () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} placeholder="Phone" />);
    fireEvent.change(screen.getByPlaceholderText("Phone"), { target: { value: "15406930536" } });
    expect(onChange).toHaveBeenLastCalledWith("+15406930536");
  });
});
