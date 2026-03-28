import Select from "@/components/ui/Select";
import type { CommunicationType } from "@/api/communications";

interface ChannelSelectorProps {
  value: CommunicationType;
  onChange: (value: CommunicationType) => void;
  allowSms: boolean;
}

const ChannelSelector = ({ value, onChange, allowSms }: ChannelSelectorProps) => (
  <Select label="Submit via" value={value} onChange={(e) => onChange(e.target.value as CommunicationType)}>
    <option value="chat">Chat</option>
    {allowSms && <option value="sms">SMS</option>}
  </Select>
);

export default ChannelSelector;
