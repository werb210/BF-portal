export const SupportService = {
  // Support endpoints are not in MVP contract.
  listEscalations: async (): Promise<{ data: unknown[] }> => ({ data: [] }),
  listIssues: async (): Promise<{ data: unknown[] }> => ({ data: [] })
};
