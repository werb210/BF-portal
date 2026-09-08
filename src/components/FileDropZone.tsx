// BF_PORTAL_BLOCK_v640_IPAD_WORKSTATION_v1
import { useCallback, useState, type ReactNode } from "react";

export default function FileDropZone({
  onFiles, accept, children,
}: { onFiles: (files: File[]) => void; accept?: string[]; children?: ReactNode }) {
  const [active, setActive] = useState(false);

  const filter = useCallback((files: File[]) => {
    if (!accept?.length) return files;
    return files.filter((f) => accept.some((ext) => f.name.toLowerCase().endsWith(ext.toLowerCase())));
  }, [accept]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setActive(true); }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setActive(false);
        const files = filter(Array.from(e.dataTransfer?.files ?? []));
        if (files.length) onFiles(files);
      }}
      data-active={active || undefined}
      style={{
        border: `2px dashed ${active ? "#2563eb" : "#cbd5e1"}`,
        borderRadius: 10, padding: 20, transition: "border-color 120ms",
      }}
    >
      {children ?? <p style={{ margin: 0, color: "#64748b" }}>Drop files here</p>}
    </div>
  );
}
