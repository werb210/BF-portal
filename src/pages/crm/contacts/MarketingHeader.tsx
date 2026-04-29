import { useEffect, useState } from "react";
import { fetchContactMarketing, type ApolloContactPayload } from "@/api/apolloMarketing";

type Props = { contactId: string };

export default function MarketingHeader({ contactId }: Props) {
  const [data, setData] = useState<ApolloContactPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchContactMarketing(contactId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (!data) return null;
  const lastEvent = data.events[0];

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
      {data.contact.apollo_stage && <span>Apollo: {data.contact.apollo_stage}</span>}
      {lastEvent && <span>Last activity: {lastEvent.event_type.replace("email_", "")}</span>}
    </div>
  );
}
