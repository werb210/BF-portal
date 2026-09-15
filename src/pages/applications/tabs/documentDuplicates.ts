// BF_PORTAL_DOCUMENT_DUPLICATE_BADGES_v259
// Reads BF-Server v256 GET /api/documents/:applicationId/duplicates. The oldest
// upload of each file is the original; every later identical upload is a copy.
export type DuplicateDoc = { id: string; category: string | null; filename: string | null; status: string | null; created_at?: string };
export type DuplicateGroup = { hash: string; original: DuplicateDoc; copies: DuplicateDoc[] };
export type DuplicateRef = { filename: string | null; category: string | null };

export function parseDuplicateGroups(response: unknown): DuplicateGroup[] {
  const r = response as { groups?: unknown; data?: { groups?: unknown } } | null;
  const groups = r?.groups ?? r?.data?.groups;
  if (!Array.isArray(groups)) return [];
  return groups.filter((g: any) => g?.original?.id && Array.isArray(g?.copies) && g.copies.length > 0) as DuplicateGroup[];
}

/** documentId of each copy -> the original it duplicates. Originals are not badged. */
export function buildDuplicateIndex(groups: DuplicateGroup[]): Record<string, DuplicateRef> {
  const index: Record<string, DuplicateRef> = {};
  for (const g of groups) {
    for (const copy of g.copies) {
      if (copy?.id) index[copy.id] = { filename: g.original.filename, category: g.original.category };
    }
  }
  return index;
}

export function extraCopyIds(groups: DuplicateGroup[]): string[] {
  return groups.flatMap((g) => g.copies.map((c) => c.id).filter(Boolean));
}

export function duplicateBadgeText(ref: DuplicateRef): string {
  const name = ref.filename ?? "another upload";
  return ref.category ? `Duplicate of ${name} (${ref.category})` : `Duplicate of ${name}`;
}
