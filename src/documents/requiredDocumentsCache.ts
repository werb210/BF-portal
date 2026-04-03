let cache: Record<string, string[]> = {};

export function syncRequiredDocumentsFromStatus(status: any) {
  const docs = new Set<string>();

  if (status?.requiredDocs) {
    status.requiredDocs.forEach((d: string) => docs.add(d));
  }

  docs.add("bank_statements");

  cache = { default: Array.from(docs) };

  return cache;
}

export function getRequiredDocs() {
  return cache;
}
