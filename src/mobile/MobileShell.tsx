import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import InstallBanner from "@/mobile/InstallBanner";

interface Props {
  children: ReactNode;
}

export default function MobileShell({ children }: Props) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#020C1C] text-white flex flex-col">
      <header className="h-14 flex items-center justify-center border-b border-white/10">
        <h1 className="text-sm font-semibold tracking-wide">Boreal Portal</h1>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>

      <InstallBanner />

      <nav className="h-16 border-t border-white/10 grid grid-cols-3 text-xs">
        <a href="/dashboard" className={navClass(location.pathname, "/dashboard")}>
          Dashboard
        </a>
        <a href="/pipeline" className={navClass(location.pathname, "/pipeline")}>
          Pipeline
        </a>
        <a href="/crm" className={navClass(location.pathname, "/crm")}>
          CRM
        </a>
      </nav>
    </div>
  );
}

function navClass(path: string, route: string) {
  return `flex items-center justify-center ${
    path.startsWith(route) ? "text-white" : "text-white/40"
  }`;
}
