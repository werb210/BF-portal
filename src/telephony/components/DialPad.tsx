import React, { useState } from "react";
import { startCall } from "../services/voiceDevice";

export default function DialPad() {
  const [number, setNumber] = useState("");

  const handleDial = async () => {
    if (!number) return;

    try {
      await startCall(number);
    } catch (err) {
      console.error("Call failed", err);
    }
  };

  return (
    <div>
      <input
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Enter number"
      />

      <button onClick={handleDial}>Call</button>
    </div>
  );
}
