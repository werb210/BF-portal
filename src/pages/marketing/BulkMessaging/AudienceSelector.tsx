import type { AudienceFilter } from "@/api/bulkMessaging";

interface Props {
  value: AudienceFilter;
  onChange: (value: AudienceFilter) => void;
}

const AudienceSelector = ({ value, onChange }: Props) => (
  <div className="grid grid-cols-2 gap-3">
    <label className="grid gap-1">
      <span className="text-muted">CRM tags</span>
      <input
        className="input"
        value={value.crmTags?.join(", ") || ""}
        onChange={(e) => onChange({ ...value, crmTags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })}
      />
    </label>
    <label className="grid gap-1">
      <span className="text-muted">Silo</span>
      <input className="input" value={value.silo || ""} onChange={(e) => onChange({ ...value, silo: e.target.value })} />
    </label>
    <label className="grid gap-1">
      <span className="text-muted">Owner</span>
      <input className="input" value={value.owner || ""} onChange={(e) => onChange({ ...value, owner: e.target.value })} />
    </label>
    <label className="grid gap-1">
      <span className="text-muted">Application stage</span>
      <input
        className="input"
        value={value.applicationStage || ""}
        onChange={(e) => onChange({ ...value, applicationStage: e.target.value })}
      />
    </label>
    <label className="grid gap-1 col-span-2">
      <span className="text-muted">Retargeting lists</span>
      <input
        className="input"
        value={value.retargetingListIds?.join(", ") || ""}
        onChange={(e) =>
          onChange({ ...value, retargetingListIds: e.target.value.split(",").map((id) => id.trim()).filter(Boolean) })
        }
      />
    </label>
  </div>
);

export default AudienceSelector;
