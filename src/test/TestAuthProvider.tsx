import React, { ReactNode } from "react";
import { AuthContext } from "@/auth/AuthContext";

type Props = {
  children: ReactNode;
  role?: "Admin" | "Staff" | "Marketing" | "Lender" | "Referrer";
};

export function TestAuthProvider({ children, role = "Admin" }: Props) {
  const value = {
    user: {
      userId: "test-user",
      role,
      capabilities: [],
      phone: null,
    },
    isAuthenticated: true,
    login: async () => {},
    logout: () => {},
  };

  return (
    <AuthContext.Provider value={value as any}>
      {children}
    </AuthContext.Provider>
  );
}
