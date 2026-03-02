import AccessRestricted from "../components/AccessRestricted";

export function RoleGuard({
  role,
  allowed,
  children,
}: {
  role: string;
  allowed: string[];
  children: React.ReactNode;
}) {
  if (!allowed.includes(role)) {
    return <AccessRestricted />;
  }

  return <>{children}</>;
}
