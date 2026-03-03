import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

export default function MobileShell({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#020C1C] text-white flex flex-col">
      <header className="h-14 flex items-center justify-center border-b border-white/10">
        <h1 className="text-sm font-semibold">Boreal Portal</h1>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>

      <nav className="h-16 border-t border-white/10 grid grid-cols-3 text-xs">
        <Link to="/dashboard" className={link(location.pathname, "/dashboard")}>
          Dashboard
        </Link>
        <Link to="/pipeline" className={link(location.pathname, "/pipeline")}>
          Pipeline
        </Link>
        <Link to="/crm" className={link(location.pathname, "/crm")}>
          CRM
        </Link>
      </nav>
    </div>
  );
}

function link(path: string, route: string) {
  return `flex items-center justify-center ${
    path.startsWith(route) ? "text-white" : "text-white/40"
  }`;
}
