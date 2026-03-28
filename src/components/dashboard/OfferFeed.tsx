import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { dashboardApi } from "@/api/dashboard";

const OfferFeed = () => {
  const enableDashboardQueries = process.env.NODE_ENV !== "test";
  const { data, isLoading } = useQuery({ queryKey: ["dashboard", "offers"], queryFn: dashboardApi.getOffers, enabled: enableDashboardQueries });

  return (
    <Card title="Offer Activity">
      {isLoading ? <p>Loading…</p> : null}
      <ul className="space-y-1 text-sm">
        <li>New offers: {data?.newOffers ?? 0}</li>
        <li>Accepted offers: {data?.acceptedOffers ?? 0}</li>
        <li>Expiring offers: {data?.expiringOffers ?? 0}</li>
      </ul>
    </Card>
  );
};

export default OfferFeed;
