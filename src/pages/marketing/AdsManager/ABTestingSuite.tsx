import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery } from "@tanstack/react-query";
import { fetchABTests } from "@/api/marketing.ads";

const ABTestingSuite = () => {
  const { data, isLoading } = useQuery({ queryKey: ["ab-tests"], queryFn: fetchABTests });

  return (
    <Card title="A/B Testing Suite">
      {isLoading && <AppLoading />}
      {!isLoading && (
        <Table headers={["Ad", "Platform", "Metric", "Variant A", "Variant B", "Winner"]}>
          {(data || []).map((test) => {
            const [variantA, variantB] = test.variants;
            if (!variantA || !variantB) {
              return null;
            }
            const winner =
              (test.metric === "clicks" ? variantA.clicks : variantA.conversions) >=
              (test.metric === "clicks" ? variantB.clicks : variantB.conversions)
                ? variantA
                : variantB;
            return (
              <tr key={test.id}>
                <td>{test.adId}</td>
                <td>{test.platform}</td>
                <td className="capitalize">{test.metric}</td>
                <td>
                  <div>{variantA.headline}</div>
                  <div className="text-muted text-xs">Clicks {variantA.clicks} / Conv. {variantA.conversions}</div>
                </td>
                <td>
                  <div>{variantB.headline}</div>
                  <div className="text-muted text-xs">Clicks {variantB.clicks} / Conv. {variantB.conversions}</div>
                </td>
                <td>{winner.headline}</td>
              </tr>
            );
          })}
          {!data?.length && (
            <tr>
              <td colSpan={6}>No tests running.</td>
            </tr>
          )}
        </Table>
      )}
    </Card>
  );
};

export default ABTestingSuite;
