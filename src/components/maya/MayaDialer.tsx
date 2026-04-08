import { useEffect, useState } from "react";
import { initializeVoice, makeCall, destroyVoice } from "@/services/voiceService";

export default function MayaDialer() {
  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    initializeVoice("maya").then(() => setReady(true)).catch(console.error);
  }, []);

  return (
    <div style={{border:"1px solid #ccc", padding:12, borderRadius:8}}>
      <div>Dialer: {ready ? "ready" : "loading..."}</div>
      <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Phone" />
      <button onClick={()=>makeCall(phone)} disabled={!ready}>Call</button>
      <button onClick={()=>destroyVoice()}>Hangup</button>
    </div>
  );
}
