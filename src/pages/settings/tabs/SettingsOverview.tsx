// BF_PORTAL_v65_REMOVE_BRANDING — Branding card removed; the
// /settings/branding route is no longer linked from the overview.
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const SettingsOverview = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  return (
    <section className="settings-panel" aria-label="Settings overview">
      <header>
        <h2>Settings</h2>
        <p>Choose a section to manage profile, runtime verification, or user access.</p>
      </header>
      <div className="settings-overview">
        <Link className="settings-overview__card" to="/settings/profile">
          <h3>My Profile</h3>
          <p>Update your name, phone, and connected accounts.</p>
        </Link>
        <Link className="settings-overview__card" to="/settings/runtime">
          <h3>Runtime Verification</h3>
          <p>Monitor health, schema, CORS, and build info.</p>
        </Link>
        {isAdmin && (
          <Link className="settings-overview__card" to="/settings/users">
            <h3>User Management</h3>
            <p>Admin-only access to add, edit, and disable users.</p>
          </Link>
        )}
      </div>
    </section>
  );
};

export default SettingsOverview;
