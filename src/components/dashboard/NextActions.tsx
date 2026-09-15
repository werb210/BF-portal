// BF_PORTAL_NEXT_ACTIONS_v208
// The per-file companion to Urgent Actions.
//
// Urgent Actions answers "how many". This answers "which one, and do what" - a
// count of four missing-document deals tells nobody which four. Every row names
// the business, the action and the reason the server derived it from, because a
// suggestion whose basis is invisible is one staff learn to scroll past.
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import { api } from "@/lib/api";

type NextAction = {
  applicationId: string;
  businessName: string | null;
  contactId: string | null;
  action: string;
  reason: string;
  priority: number;
};

const NextActions = () => {
  const enabled = import.meta.env.MODE !== "test";
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "next-actions"],
    enabled,
    queryFn: async () => {
      const r = await api.post<{ ok?: boolean; actions?: unknown }>(
        "/api/maya/staff/next-actions",
        { limit: 10 },
      );
      const raw = (r as any)?.data?.actions ?? (r as any)?.actions;
      // Validate the shape before rendering it. Resolving is not the same as
      // being correct, and a bad payload must not take the dashboard down.
      return Array.isArray(raw) ? (raw as NextAction[]) : [];
    },
  });

  const actions = Array.isArray(data) ? data : [];

  return (
    <Card title="Suggested next actions">
      {isLoading ? <p className="text-sm">Loading…</p> : null}

      {isError ? (
        <p className="text-sm text-[#6b7280]">Could not load suggestions.</p>
      ) : null}

      {!isLoading && !isError && actions.length === 0 ? (
        <p className="text-sm text-[#6b7280]">
          Nothing needs chasing right now.
        </p>
      ) : null}

      <ul className="space-y-3">
        {actions.map((a) => (
          <li key={a.applicationId} className="text-sm">
            <Link
              to={`/applications/${encodeURIComponent(a.applicationId)}`}
              className="font-medium text-[var(--ui-accent-blue)] no-underline"
            >
              {a.businessName || "Untitled application"}
            </Link>
            <div className="text-[#111827]">{a.action}</div>
            {/* The why, in the server's own words. */}
            <div className="text-xs text-[#6b7280]">{a.reason}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default NextActions;
