import { type ReactNode } from "react";

type Props = {
  children: ReactNode;
  role?: "Admin" | "Staff" | "Marketing" | "Lender" | "Referrer";
};

export function TestAuthProvider({ children }: Props) {
  return <>{children}</>;
}
