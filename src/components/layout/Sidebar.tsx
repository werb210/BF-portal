import { NavLink } from "react-router-dom";
import { useSilo } from "@/hooks/useSilo";
import { useAuth } from "@/hooks/useAuth";
import { canAccessStaffNav, hasRequiredRole, resolveUserRole, type UserRole } from "@/utils/roles";
import { BUSINESS_UNIT_CONFIG } from "@/config/businessUnitConfig";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type NavigationItem = {
  label: string;
  path: string;
  roles?: UserRole[];
};

type NavigationSection = {
  title?: string;
  items: NavigationItem[];
};

const navigationSections: NavigationSection[] = [
  {
    items: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Applications", path: "/applications" },
      { label: "Contacts", path: "/crm/contacts" },
      { label: "Companies", path: "/crm/companies" },
      { label: "Leads", path: "/leads" },
      { label: "Communications", path: "/communications" },
      { label: "Readiness Leads", path: "/portal/readiness", roles: ["Admin", "Staff", "Marketing"] },
      { label: "Capital Readiness", path: "/continuations", roles: ["Admin", "Staff", "Marketing"] },
      { label: "Live Chat", path: "/chat" },
      { label: "AI Chat", path: "/ai-chat", roles: ["Admin", "Staff", "Marketing"] },
      { label: "AI Comms", path: "/ai-comms", roles: ["Admin", "Staff", "Marketing"] },
      { label: "Issues", path: "/issues", roles: ["Admin", "Staff", "Marketing"] },
      { label: "Calendar", path: "/calendar" },
      { label: "Marketing", path: "/marketing", roles: ["Admin", "Marketing"] },
      { label: "Lenders", path: "/lenders" },
      { label: "Settings", path: "/settings" }
    ]
  },
  {
    title: "AI & Support",
    items: [
      { label: "AI Knowledge", path: "/admin/ai", roles: ["Admin"] },
      { label: "Support", path: "/admin/support", roles: ["Admin"] },
      { label: "Analytics", path: "/admin/analytics", roles: ["Admin"] },
      { label: "Analytics Events", path: "/admin/analytics-events", roles: ["Admin"] },
      { label: "Website Leads", path: "/admin/website-leads", roles: ["Admin"] },
      { label: "Website Leads Table", path: "/admin/leads", roles: ["Admin"] },
      { label: "AI Knowledge Base", path: "/admin/ai-knowledge", roles: ["Admin"] },
      { label: "AI Knowledge Upload", path: "/admin/ai-knowledge-upload", roles: ["Admin"] },
      { label: "Comparison Editor", path: "/admin/comparison", roles: ["Admin"] },
      { label: "Issue Reports", path: "/admin/issue-reports", roles: ["Admin"] },
      { label: "Live Chat Queue", path: "/admin/live-chat", roles: ["Admin"] },
      { label: "Conversions", path: "/admin/conversions", roles: ["Admin"] },
      { label: "AI Live Chat", path: "/portal/ai", roles: ["Admin", "Staff", "Marketing"] },
      { label: "Chats", path: "/admin/ai/chats", roles: ["Admin", "Staff", "Marketing"] },
      { label: "AI Policy", path: "/admin/ai-policy", roles: ["Admin"] },
      { label: "Issues", path: "/admin/ai/issues", roles: ["Admin", "Staff", "Marketing"] },
      { label: "Operations", path: "/admin/operations", roles: ["Admin"] },
      { label: "Maya Intelligence", path: "/admin/maya", roles: ["Admin"] },
      { label: "Maya Outbound Upload", path: "/admin/maya-outbound", roles: ["Admin"] }
    ]
  }
];

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { silo } = useSilo();
  const businessUnitConfig = BUSINESS_UNIT_CONFIG[silo as keyof typeof BUSINESS_UNIT_CONFIG] ?? BUSINESS_UNIT_CONFIG.BF;
  const { user } = useAuth();
  const role = resolveUserRole((user as { role?: string | null } | null)?.role ?? null);
  const canViewStaffNav = canAccessStaffNav(role);
  const visibleSections = canViewStaffNav
    ? navigationSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            if (!businessUnitConfig.allowClientComms && ["/communications", "/chat", "/ai-comms", "/ai-chat"].includes(item.path)) {
              return false;
            }
            return !item.roles || hasRequiredRole(role, item.roles);
          })
        }))
        .filter((section) => section.items.length > 0)
    : [];

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar__header">
        <div className="flex items-center gap-2">
          <img src={businessUnitConfig.logoUrl} alt={`${businessUnitConfig.name} logo`} style={{ height: 28, width: "auto" }} />
          <span>{businessUnitConfig.name || "Boreal Financial"}</span>
        </div>
      </div>
      <nav className="sidebar__nav">
        {visibleSections.map((section) => (
          <div key={section.title ?? "main"} className="mb-4">
            {section.title ? <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{section.title}</p> : null}
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/dashboard"}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
                }
                onClick={onClose}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
