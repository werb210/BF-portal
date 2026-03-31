import { useEffect, useState } from "react";
import { initTelephony, callNumber, hangup } from "@/services/telephony";

export default function MayaDialer() {
  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    initTelephony().then(() => setReady(true)).catch(console.error);
  }, []);

  return (
    <div style={{border:"1px solid #ccc", padding:12, borderRadius:8}}>
      <div>Dialer: {ready ? "ready" : "loading..."}</div>
      <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Phone" />
      <button onClick={()=>callNumber(phone)} disabled={!ready}>Call</button>
      <button onClick={()=>hangup()}>Hangup</button>
    </div>
  );
}
