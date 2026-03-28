import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { Contact } from "@/api/crm";
import { fetchSmsThread, sendSms } from "@/api/communications";
import SMSThread from "./SMSThread";
import { useCrmStore } from "@/state/crm.store";

const siloNumbers: Record<string, string> = {
  BF: "+1-800-BF",
  SLF: "+1-800-SLF",
  BI: "+1-800-BI"
};

interface SMSComposerProps {
  visible: boolean;
  contact: Contact;
  onClose: () => void;
}

const SMSComposer = ({ visible, contact, onClose }: SMSComposerProps) => {
  const queryClient = useQueryClient();
  const { silo } = useCrmStore();
  const [body, setBody] = useState("");
  const { data: messages = [] } = useQuery({
    queryKey: ["sms", contact.id],
    queryFn: () => fetchSmsThread(contact.id),
    enabled: visible
  });

  useEffect(() => {
    if (!visible) setBody("");
  }, [visible]);

  if (!visible) return null;

  const handleSend = async () => {
    if (!body) return;
    const phone = siloNumbers[silo];
    if (!phone) return;
    await sendSms(contact, body, phone);
    setBody("");
    queryClient.invalidateQueries({ queryKey: ["sms", contact.id] });
  };

  return (
    <div className="sms-composer" data-testid="sms-composer">
      <Card
        title={`SMS — ${contact.name}`}
        actions={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        <p>Messages sent from {siloNumbers[silo] ?? "Unknown number"}</p>
        <SMSThread messages={messages} />
        <div className="flex gap-2 items-center mt-2">
          <Select value={silo} onChange={() => undefined}>
            <option value="BF">BF</option>
            <option value="BI">BI</option>
            <option value="SLF">SLF</option>
          </Select>
          <Input
            placeholder="Type message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button onClick={handleSend}>Submit</Button>
        </div>
      </Card>
    </div>
  );
};

export default SMSComposer;
