import Card from "@/components/ui/Card";
import RequireRole from "@/components/auth/RequireRole";
import MarketingDashboard from "./MarketingDashboard";

const MarketingPage = () => {
  return (
    <RequireRole roles={["Admin"]} message="This space is limited to Admins.">
      <div className="page marketing-page">
        <Card title="Marketing Ops Hub">
          <MarketingDashboard />
        </Card>
      </div>
    </RequireRole>
  );
};

export default MarketingPage;
