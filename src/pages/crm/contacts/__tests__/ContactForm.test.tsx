import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContactForm from "../ContactForm";

describe("ContactForm", () => {
  it("requires first_name, validates email, and formats phone to E.164", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ContactForm onSave={onSave} />);

    fireEvent.submit(screen.getByTestId("contact-form"));
    expect(await screen.findByText("First name is required.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("First name *"), { target: { value: "Jamie" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "invalid-email" } });
    fireEvent.submit(screen.getByTestId("contact-form"));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "jamie@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Phone"), { target: { value: "5875551234" } });
    fireEvent.blur(screen.getByPlaceholderText("Phone"));

    await waitFor(() => {
      expect((screen.getByPlaceholderText("Phone") as HTMLInputElement).value).toBe("+15875551234");
    });

    fireEvent.submit(screen.getByTestId("contact-form"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        first_name: "Jamie",
        last_name: "",
        email: "jamie@example.com",
        phone: "+15875551234",
      });
    });
  });
});
