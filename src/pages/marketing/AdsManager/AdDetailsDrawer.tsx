import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { AdRecord } from "@/api/marketing.ads";

interface Props {
  ad: AdRecord;
  onClose: () => void;
}

const AdDetailsDrawer = ({ ad, onClose }: Props) => (
  <div className="drawer">
    <Card title={`${ad.campaign} (${ad.platform})`} actions={<Button onClick={onClose}>Close</Button>}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-muted">Headline</div>
          <div>{ad.headline}</div>
        </div>
        <div>
          <div className="text-muted">Body</div>
          <div>{ad.body}</div>
        </div>
        <div>
          <div className="text-muted">Budget</div>
          <div>${ad.budget.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-muted">Status</div>
          <div className="capitalize">{ad.status}</div>
        </div>
        <div>
          <div className="text-muted">Impressions</div>
          <div>{ad.impressions.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-muted">Clicks</div>
          <div>{ad.clicks.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-muted">Conversions</div>
          <div>{ad.conversions.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-muted">Qualified applications</div>
          <div>{ad.qualifiedApplications.toLocaleString()}</div>
        </div>
      </div>
    </Card>
  </div>
);

export default AdDetailsDrawer;
