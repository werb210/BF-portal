import React, { useState } from "react";
import { makeCall } from "../../services/voiceService";

export default function DialerPanel() {

  const [number, setNumber] = useState("");

  const handleCall = async () => {
    await makeCall(number);
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        height: "100%",
        width: "350px",
        background: "#111",
        color: "#fff",
        padding: "20px"
      }}
    >
      <h2>Dialer</h2>

      <input
        value={number}
        onChange={e => setNumber(e.target.value)}
        placeholder="Enter number"
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px"
        }}
      />

      <button onClick={handleCall}>
        Call
      </button>
    </div>
  );
}
