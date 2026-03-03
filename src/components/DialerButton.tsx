import React, { useState } from "react";
import DialerPanel from "./dialer/DialerPanel";

export default function DialerButton() {

  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          padding: "15px"
        }}
      >
        Dialer
      </button>

      {open && <DialerPanel />}
    </>
  );
}
