// BF_PORTAL_v789_AUTHED_MEDIA - audio and images that need the staff session. Nothing is fetched
// until the user asks for it (Play / Show image); the file then comes from a blob: URL.
import { useEffect, useRef, type CSSProperties } from "react";
import { useAuthedObjectUrl } from "@/lib/authedMedia";

const linkBtn: CSSProperties = {
  background: "transparent", border: "1px solid var(--ui-border)", borderRadius: 6, padding: "6px 10px",
  color: "var(--ui-text)", fontSize: 13, cursor: "pointer",
};

export function AuthedAudio({ path, label = "Play recording", style }: { path: string; label?: string; style?: CSSProperties }) {
  const media = useAuthedObjectUrl(path);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (media.url && audioRef.current) void audioRef.current.play?.()?.catch?.(() => undefined);
  }, [media.url]);
  if (media.url) {
    return <audio ref={audioRef} data-testid="authed-audio" controls src={media.url} style={{ width: "100%", height: 36, ...style }} />;
  }
  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" onClick={() => void media.load()} disabled={media.loading} style={linkBtn}>
        {media.loading ? "Loading..." : label}
      </button>
      {media.error && <div role="alert" style={{ color: "var(--ui-text-danger)", fontSize: 12, marginTop: 4 }}>{media.error}</div>}
    </div>
  );
}

export function AuthedImage({ path, name }: { path: string; name: string }) {
  const media = useAuthedObjectUrl(path);
  if (media.url) {
    return (
      <a href={media.url} target="_blank" rel="noreferrer">
        <img src={media.url} alt={name} data-testid="authed-image" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, display: "block" }} />
      </a>
    );
  }
  return (
    <span>
      <button type="button" onClick={() => void media.load()} disabled={media.loading} style={{ ...linkBtn, color: "inherit" }}>
        {media.loading ? "Loading..." : `Show ${name.toLowerCase()}`}
      </button>
      {media.error && <span role="alert" style={{ display: "block", fontSize: 12 }}>{media.error}</span>}
    </span>
  );
}
