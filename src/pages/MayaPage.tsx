import MayaChat from "@/components/maya/MayaChat";
import MayaDialer from "@/components/maya/MayaDialer";

export default function MayaPage() {
  return (
    <div style={{display:"grid", gap:16}}>
      <h2>Maya</h2>
      <MayaChat />
      <MayaDialer />
    </div>
  );
}
