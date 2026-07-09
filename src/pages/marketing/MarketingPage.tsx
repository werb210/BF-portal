import Card from "@/components/ui/Card";
import RequireRole from "@/components/auth/RequireRole";
import MarketingDashboard from "./MarketingDashboard";

const MarketingPage = () => {
  return (
    <RequireRole roles={["Admin", "Marketing"]} message="This space is limited to Marketing and Admins.">
      <div className="page">
        <Card title="Marketing">
          <MarketingDashboard />
        </Card>
      </div>
    </RequireRole>
  );
};

export default MarketingPage;
