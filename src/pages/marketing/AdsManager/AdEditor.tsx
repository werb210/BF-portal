import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { AdRecord, AdPlatform } from "@/api/marketing.ads";
import { createAd, updateAd } from "@/api/marketing.ads";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Props {
  ad?: AdRecord;
  onClose: () => void;
}

const AdEditor = ({ ad, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Pick<AdRecord, "headline" | "body" | "budget" | "campaign" | "platform" | "image">>({
    headline: "",
    body: "",
    budget: 0,
    campaign: "",
    platform: "Google",
    image: ""
  });

  useEffect(() => {
    if (ad) {
      setForm({
        headline: ad.headline,
        body: ad.body,
        budget: ad.budget,
        campaign: ad.campaign,
        platform: ad.platform,
        image: ad.image || ""
      });
    }
  }, [ad]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (ad) {
        return updateAd(ad.id, form);
      }
      return createAd(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      onClose();
    }
  });

  const updateField = (key: keyof typeof form, value: string | number | AdPlatform) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="drawer">
      <Card title={ad ? "Edit ad" : "Create ad"} actions={<Button onClick={onClose}>Close</Button>}>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-muted">Campaign</span>
            <input
              className="input"
              value={form.campaign}
              onChange={(e) => updateField("campaign", e.target.value)}
              placeholder="Campaign name"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-muted">Platform</span>
            <select className="input" value={form.platform} onChange={(e) => updateField("platform", e.target.value as AdPlatform)}>
              <option>Google</option>
              <option>Meta</option>
              <option>Twitter</option>
              <option>LinkedIn</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-muted">Headline</span>
            <input className="input" value={form.headline} onChange={(e) => updateField("headline", e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-muted">Body</span>
            <textarea className="input" value={form.body} onChange={(e) => updateField("body", e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-muted">Budget</span>
            <input
              className="input"
              type="number"
              value={form.budget}
              onChange={(e) => updateField("budget", Number(e.target.value))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-muted">Image URL</span>
            <input className="input" value={form.image} onChange={(e) => updateField("image", e.target.value)} />
          </label>
          <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdEditor;
