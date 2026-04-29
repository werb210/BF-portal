import { useEffect, useState } from "react";
import { fetchContactMarketing, triggerEnrichment, type ApolloContactPayload, type EngagementEvent } from "@/api/apolloMarketing";

type Props = { contactId: string };

const eventLabel: Record<EngagementEvent["event_type"], string> = {
  email_sent: "Sent",
  email_opened: "Opened",
  email_clicked: "Clicked",
  email_replied: "Replied",
  email_bounced: "Bounced",
};

export default function MarketingTab({ contactId }: Props) {
  const [data, setData] = useState<ApolloContactPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        await triggerEnrichment(contactId).catch(() => undefined);
        const payload = await fetchContactMarketing(contactId);
        if (!cancelled) setData(payload);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load marketing data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  async function reEnrich() {
    await triggerEnrichment(contactId, true);
    const fresh = await fetchContactMarketing(contactId);
    setData(fresh);
  }

  if (loading) return <div>Loading marketing data…</div>;
  if (error) return <div style={{ color: "#b00020" }}>Error: {error}</div>;
  if (!data) return <div>No marketing data available.</div>;

  const { contact, events } = data;
  const org = contact.apollo_data?.organization;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <h3>Apollo Enrichment</h3>
        <button type="button" onClick={reEnrich}>Re-enrich</button>
        {!contact.apollo_contact_id ? (
          <p>No Apollo match found.</p>
        ) : (
          <dl>
            <dt>Title</dt><dd>{contact.apollo_data?.title ?? "—"}</dd>
            <dt>Company</dt><dd>{org?.name ?? "—"}</dd>
            <dt>Industry</dt><dd>{org?.industry ?? "—"}</dd>
            <dt>Employees</dt><dd>{org?.estimated_num_employees?.toLocaleString() ?? "—"}</dd>
          </dl>
        )}
      </div>
      <div>
        <h3>Engagement Timeline</h3>
        {events.length === 0 ? (
          <p>No engagement events recorded.</p>
        ) : (
          <ul>
            {events.map((ev) => (
              <li key={ev.id}>{eventLabel[ev.event_type]} · {ev.sequence_name ?? "—"}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
