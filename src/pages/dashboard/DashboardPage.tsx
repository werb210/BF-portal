import { Navigate } from "react-router-dom";
import RequireRole from "@/components/auth/RequireRole";
import AppLoading from "@/components/layout/AppLoading";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard/Dashboard";

const DashboardPage = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <AppLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <RequireRole roles={["Admin", "Staff", "Ops"]}>
      <Dashboard />
    </RequireRole>
  );
};

export default DashboardPage;
