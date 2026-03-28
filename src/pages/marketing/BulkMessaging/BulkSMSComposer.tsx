import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSmsCampaigns, sendBulkSms, type BulkSMS } from "@/api/bulkMessaging";
import AudienceSelector from "./AudienceSelector";

const BulkSMSComposer = () => {
  const queryClient = useQueryClient();
  const { data: campaigns } = useQuery({ queryKey: ["bulk-sms"], queryFn: fetchSmsCampaigns });
  const [form, setForm] = useState<Omit<BulkSMS, "id" | "status" | "metrics">>({
    body: "",
    audience: {}
  });

  const chars = form.body.length;
  const parts = Math.max(1, Math.ceil(chars / 160));

  const sendMutation = useMutation({
    mutationFn: () => sendBulkSms(form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bulk-sms"] })
  });

  return (
    <Card
      title="Bulk SMS"
      actions={
        <Button disabled={sendMutation.isPending || !form.body} onClick={() => sendMutation.mutate()}>
          Submit
        </Button>
      }
    >
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-muted">Message</span>
          <textarea className="input" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="text-xs text-muted">{chars} characters • {parts} part SMS</div>
        </label>
        <AudienceSelector value={form.audience} onChange={(audience) => setForm({ ...form, audience })} />
        <div>
          <div className="text-muted mb-2">Recent sends</div>
          <ul className="space-y-1">
            {(campaigns || []).map((sms) => (
              <li key={sms.id} className="text-sm">
                {sms.body.slice(0, 60)}... — Delivered {sms.metrics.delivered} • Failed {sms.metrics.failed} • Replies {sms.metrics.replies}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default BulkSMSComposer;
