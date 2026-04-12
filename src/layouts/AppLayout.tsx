import { ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { name: "Dashboard", path: "/portal" },
  { name: "Pipeline", path: "/pipeline" },
  { name: "CRM", path: "/crm" },
  { name: "Lenders", path: "/lenders" },
  { name: "Documents", path: "/applications" },
  { name: "Reports", path: "/reports" },
  { name: "Settings", path: "/settings" }
];

export default function AppLayout({ children }: { children?: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <aside className="flex w-64 flex-col bg-gray-900 text-white">
        <div className="border-b border-gray-700 p-4 text-xl font-bold">Boreal</div>

        <nav className="flex flex-col gap-1 p-2">
          {navItems.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(`${item.path}/`));

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`rounded-md px-4 py-2 text-sm ${
                  active ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto bg-gray-100 p-6 text-gray-900">{children ?? <Outlet />}</main>
    </div>
  );
}
