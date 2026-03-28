import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchEmailCampaigns, sendBulkEmail, type BulkEmail } from "@/api/bulkMessaging";
import AudienceSelector from "./AudienceSelector";

const BulkEmailComposer = () => {
  const queryClient = useQueryClient();
  const { data: campaigns } = useQuery({ queryKey: ["bulk-email"], queryFn: fetchEmailCampaigns });
  const [form, setForm] = useState<Omit<BulkEmail, "id" | "status" | "metrics">>({
    subject: "",
    body: "",
    audience: {},
    template: ""
  });

  const sendMutation = useMutation({
    mutationFn: () => sendBulkEmail(form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bulk-email"] })
  });

  return (
    <Card title="Bulk Email" actions={<Button disabled={sendMutation.isPending} onClick={() => sendMutation.mutate()}>Submit</Button>}>
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-muted">Subject</span>
          <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="text-muted">Template</span>
          <input className="input" value={form.template || ""} onChange={(e) => setForm({ ...form, template: e.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="text-muted">Body</span>
          <textarea className="input" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </label>
        <AudienceSelector value={form.audience} onChange={(audience) => setForm({ ...form, audience })} />
        <div>
          <div className="text-muted mb-2">Recent sends</div>
          <ul className="space-y-1">
            {(campaigns || []).map((campaign) => (
              <li key={campaign.id} className="text-sm">
                {campaign.subject} — Delivered {campaign.metrics.delivered} • Opens {campaign.metrics.opens} • Clicks {campaign.metrics.clicks}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default BulkEmailComposer;
