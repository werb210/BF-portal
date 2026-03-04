import { registerSW } from "virtual:pwa-register";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SiloProvider } from "@/core/SiloContext";
import { bootstrapVoice } from "./telephony/services/voiceDevice";
import { getVoiceToken } from "./telephony/api/getVoiceToken";

registerSW({ immediate: true });

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);

async function startVoice() {
  try {
    const token = await getVoiceToken("staff_portal");

    await bootstrapVoice(token);
  } catch (err) {
    console.error("Voice initialization failed");
  }
}

void startVoice();

if (import.meta.env.MODE === "production") {
  root.render(
    <React.StrictMode>
      <SiloProvider>
        <App />
      </SiloProvider>
    </React.StrictMode>
  );
} else {
  root.render(
    <SiloProvider>
      <App />
    </SiloProvider>
  );
}
