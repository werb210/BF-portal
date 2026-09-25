// BF_PORTAL_BLOCK_v505_TEAM_LINK_PREVIEW_CARD - the first link in a Team message
// gets a small card (site, title, description, image) from BF-Server v504's
// GET /api/team/link-preview, which fetches the page server-side. One request
// per URL per page load (module cache); nothing renders if the page gave no
// title or description.
import { useEffect, useState } from "react";
import { api } from "@/api";

export type LinkPreviewData = {
  url: string;
  ok: boolean;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

const cache = new Map<string, Promise<LinkPreviewData | null>>();

export function firstLink(text: string | null | undefined): string | null {
  const match = String(text ?? "").match(/https?:\/\/[^\s<>"')]+/i);
  return match ? match[0].replace(/[.,;:!?]+$/, "") : null;
}

function load(url: string): Promise<LinkPreviewData | null> {
  let request = cache.get(url);
  if (!request) {
    request = api<{ preview?: LinkPreviewData }>("/api/team/link-preview", { params: { url } })
      .then(({ preview }) => (preview?.ok && (preview.title || preview.description) ? preview : null))
      .catch(() => null);
    cache.set(url, request);
  }
  return request;
}

export default function LinkPreviewCard({ text }: { text: string | null | undefined }) {
  const url = firstLink(text);
  const [data, setData] = useState<LinkPreviewData | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    if (url) void load(url).then((preview) => { if (alive) setData(preview); });
    return () => { alive = false; };
  }, [url]);

  if (!url || !data) return null;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noreferrer noopener"
      data-testid="link-preview-card"
      style={{ display: "flex", gap: 10, marginTop: 8, padding: 8, borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", textDecoration: "none", maxWidth: 360, whiteSpace: "normal" }}
    >
      {data.imageUrl ? <img src={data.imageUrl} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} /> : null}
      <span style={{ minWidth: 0 }}>
        {data.siteName ? <span style={{ display: "block", fontSize: 11, color: "var(--ui-text-muted)" }}>{data.siteName}</span> : null}
        {data.title ? <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{data.title}</span> : null}
        {data.description ? <span style={{ fontSize: 12, color: "var(--ui-text-muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{data.description}</span> : null}
      </span>
    </a>
  );
}
