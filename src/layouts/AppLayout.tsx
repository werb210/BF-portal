import { ReactNode, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import MayaPanel from "@/components/maya/MayaPanel";

export default function AppLayout({ children }: { children?: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMayaOpen, setIsMayaOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="app-shell__content">
        <Topbar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} onOpenMaya={() => setIsMayaOpen(true)} />
        <main className="app-shell__main">{children ?? <Outlet />}</main>
      </div>
      {isSidebarOpen ? <button type="button" className="sidebar-overlay" aria-label="Close navigation" onClick={() => setIsSidebarOpen(false)} /> : null}
      <MayaPanel open={isMayaOpen} onClose={() => setIsMayaOpen(false)} />
    </div>
  );
}
