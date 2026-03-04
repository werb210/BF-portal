import { registerSW } from "virtual:pwa-register";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SiloProvider } from "@/core/SiloContext";
import { initializeVoice } from "./telephony/services/voiceDevice";

registerSW({ immediate: true });

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);

void initializeVoice("staff_portal");

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
