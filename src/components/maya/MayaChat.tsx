import { useState } from "react";
import { sendMayaMessage } from "@/api/maya";

export default function MayaChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{role:"user"|"maya"; text:string}[]>([]);

  async function send() {
    if (!input) return;
    const userMsg = input;
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setInput("");

    try {
      const res = await sendMayaMessage(userMsg);
      const reply = res?.reply || res?.data?.reply || "No response";
      setMessages((m) => [...m, { role: "maya", text: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "maya", text: "Error" }]);
    }
  }

  return (
    <div style={{border:"1px solid #ccc", padding:12, borderRadius:8}}>
      <div style={{height:200, overflow:"auto", marginBottom:8}}>
        {messages.map((m, i) => (
          <div key={i}><b>{m.role}:</b> {m.text}</div>
        ))}
      </div>
      <input value={input} onChange={(e)=>setInput(e.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}
