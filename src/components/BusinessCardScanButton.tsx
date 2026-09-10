// BF_PORTAL_BLOCK_v113_IPAD_PENCIL_QUICKLOOK_CARDSCAN
import { useCallback, useState } from "react";
import { parseBusinessCard, type ParsedCard } from "@/native/businessCard";
import { isNativeWorkstation, scanBusinessCard } from "@/native/ipadWorkstation";

type Props = {
  onScanned: (card: ParsedCard) => void;
  className?: string;
  label?: string;
};

/** Renders nothing off-device: a dead button is worse than no button. */
export default function BusinessCardScanButton({ onScanned, className, label }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await scanBusinessCard();
      if (result.cancelled) return;
      if (result.lines.length === 0) {
        setError("No text found on that card. Try again with more light.");
        return;
      }
      onScanned(parseBusinessCard(result.lines));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }, [onScanned]);

  if (!isNativeWorkstation()) return null;
  return (
    <div className={className}>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        {busy ? "Scanning…" : (label ?? "Scan business card")}
      </button>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
