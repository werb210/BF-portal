import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Campaign } from "@/api/marketing.campaigns";
import { upsertCampaign } from "@/api/marketing.campaigns";

interface Props {
  campaign?: Campaign;
  onClose: () => void;
}

const CampaignEditor = ({ campaign, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<Campaign>>({ platform: "Google" });

  useEffect(() => {
    if (campaign) setForm(campaign);
  }, [campaign]);

  const saveMutation = useMutation({
    mutationFn: () => upsertCampaign(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      onClose();
    }
  });

  const updateField = (key: keyof Campaign, value: string | number) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="drawer">
      <Card title={campaign ? "Edit campaign" : "Create campaign"} actions={<Button onClick={onClose}>Close</Button>}>
        <div className="grid gap-2">
          <label className="grid gap-1">
            <span className="text-muted">Name</span>
            <input className="input" value={form.name || ""} onChange={(e) => updateField("name", e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-muted">Platform</span>
            <select
              className="input"
              value={form.platform}
              onChange={(e) => updateField("platform", e.target.value)}
            >
              <option>Google</option>
              <option>Meta</option>
              <option>Twitter</option>
              <option>LinkedIn</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-muted">Budget</span>
            <input
              type="number"
              className="input"
              value={form.budget || 0}
              onChange={(e) => updateField("budget", Number(e.target.value))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-muted">Status</span>
            <select className="input" value={form.status} onChange={(e) => updateField("status", e.target.value)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </label>
          <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CampaignEditor;
