import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { AuthProvider } from "../auth/AuthContext";

describe("App", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(document.body).toBeInTheDocument();
  });
});
