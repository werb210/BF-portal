import { Navigate } from "react-router-dom";
import AppLoading from "@/components/layout/AppLoading";
import { useAuth } from "@/hooks/useAuth";

const DashboardPage = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <AppLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user) return <div>Loading...</div>;

  const role = String(user.role ?? "Staff");
  const isAdmin = role === "Admin";
  const isMarketing = role.toLowerCase() === "marketing";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-5">
        <div className="drawer-section"><div className="drawer-section__title">Active Applications</div><div>{isMarketing ? "—" : isAdmin ? "214" : "42"}</div></div>
        <div className="drawer-section"><div className="drawer-section__title">Pipeline by Stage</div><div>{isMarketing ? "—" : "Received 32 · Review 26 · Offer 9"}</div></div>
        <div className="drawer-section"><div className="drawer-section__title">Deals Won This Month</div><div>{isMarketing ? "—" : "6"}</div></div>
        <div className="drawer-section"><div className="drawer-section__title">Commission Earned</div><div>{isMarketing ? "—" : "$125,000"}</div></div>
        <div className="drawer-section"><div className="drawer-section__title">New Leads Today</div><div>{isMarketing ? "37" : "12"}</div></div>
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        <section className="drawer-section">
          <div className="drawer-section__title">Pipeline Stage Breakdown</div>
          <p>Received ▓▓▓▓▓▓▓</p>
          <p>In Review ▓▓▓▓▓</p>
          <p>Documents Required ▓▓▓</p>
          <p>Additional Steps Required ▓▓</p>
          <p>Off to Lender ▓▓▓</p>
          <p>Offer ▓</p>
        </section>
        <section className="drawer-section">
          <div className="drawer-section__title">Recent Activity (Last 20)</div>
          <ul className="list-disc pl-5">
            <li>CRM note added for Northline Transport.</li>
            <li>Document accepted for Pine Medical.</li>
            <li>Offer sent to Fleet Harbor.</li>
          </ul>
        </section>
      </div>

      <section className="drawer-section">
        <div className="drawer-section__title">Quick Actions</div>
        <div className="flex gap-2">
          <button className="ui-button ui-button--primary">+ New Application</button>
          <button className="ui-button ui-button--secondary">View Pipeline</button>
          <button className="ui-button ui-button--secondary">Go to CRM</button>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
