import { render } from "@testing-library/react";
import { ReactElement } from "react";
import { TestAuthProvider } from "./TestAuthProvider";

export function renderWithAuth(ui: ReactElement, role: "Admin" | "Staff" | "Marketing" | "Lender" | "Referrer" = "Admin") {
  return render(
    <TestAuthProvider role={role}>
      {ui}
    </TestAuthProvider>
  );
}
