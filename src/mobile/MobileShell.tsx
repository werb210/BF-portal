import { ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";

interface Props {
  children: ReactNode;
}

export default function MobileShell({ children }: Props) {
  const location = useLocation();

  const active = (path: string) =>
    location.pathname.startsWith(path)
      ? "text-white"
      : "text-white/40";

  return (
    <div className="min-h-screen bg-[#020C1C] text-white flex flex-col">
      <header className="h-14 flex items-center justify-center border-b border-white/10">
        <h1 className="text-sm font-semibold">Boreal Portal</h1>
      </header>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      <nav className="h-14 border-t border-white/10 flex justify-around items-center text-sm">
        <Link to="/dashboard" className={active("/dashboard")}>
          Dashboard
        </Link>
        <Link to="/pipeline" className={active("/pipeline")}>
          Pipeline
        </Link>
        <Link to="/crm" className={active("/crm")}>
          CRM
        </Link>
      </nav>
    </div>
  );
}
