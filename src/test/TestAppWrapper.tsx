import { type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

interface Props {
  children: ReactNode;
  initialEntries?: string[];
}

export function TestAppWrapper({ children, initialEntries = ["/"] }: Props) {
  return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
}
