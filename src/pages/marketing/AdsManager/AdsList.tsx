import { useState } from "react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAds, toggleAdStatus, type AdRecord } from "@/api/marketing.ads";
import { useMarketingStore } from "@/state/marketing.store";
import AdDetailsDrawer from "./AdDetailsDrawer";
import AdEditor from "./AdEditor";

const AdsList = () => {
  const { platformFilter } = useMarketingStore();
  const queryClient = useQueryClient();
  const { data: ads, isLoading } = useQuery({ queryKey: ["ads"], queryFn: fetchAds });
  const [selected, setSelected] = useState<AdRecord | undefined>();
  const [editing, setEditing] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleAdStatus(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ads"] })
  });

  const filteredAds = (ads || []).filter((ad) => platformFilter === "All" || !platformFilter || ad.platform === platformFilter);

  return (
    <Card title="Ads Manager" actions={<Button onClick={() => setEditing(true)}>New ad</Button>}>
      {isLoading && <AppLoading />}
      {!isLoading && (
        <Table headers={["Platform", "Campaign", "Headline", "Spend", "Clicks", "Conv.", "Status", "Actions"]}>
          {filteredAds.map((ad) => (
            <tr key={ad.id}>
              <td>{ad.platform}</td>
              <td>{ad.campaign}</td>
              <td>{ad.headline}</td>
              <td>${ad.spend.toLocaleString()}</td>
              <td>{ad.clicks.toLocaleString()}</td>
              <td>{ad.conversions.toLocaleString()}</td>
              <td className="capitalize">{ad.status}</td>
              <td className="space-x-2">
                <Button variant="ghost" onClick={() => setSelected(ad)}>
                  Details
                </Button>
                <Button variant="ghost" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate(ad.id)}
                >
                  {ad.status === "active" ? "Pause" : "Activate"}
                </Button>
              </td>
            </tr>
          ))}
          {!filteredAds.length && (
            <tr>
              <td colSpan={8}>No ads found.</td>
            </tr>
          )}
        </Table>
      )}

      {selected && <AdDetailsDrawer ad={selected} onClose={() => setSelected(undefined)} />}
      {editing && <AdEditor ad={selected} onClose={() => setEditing(false)} />}
    </Card>
  );
};

export default AdsList;
