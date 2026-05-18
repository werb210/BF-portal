import { useDialerStore } from "@/state/dialer.store";

type OpenDialerArgs = {
  to?: string | null;
  phone?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  applicationId?: string | null;
  source?: "crm" | "pipeline" | "global";
};

export function openDialer(args: OpenDialerArgs = {}) {
  useDialerStore.getState().openDialer({
    phone: args.to ?? args.phone ?? undefined,
    contactId: args.contactId ?? undefined,
    contactName: args.contactName ?? undefined,
    applicationId: args.applicationId ?? undefined,
    source: args.source ?? "crm",
  });
}
