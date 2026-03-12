import { registerSW } from "virtual:pwa-register";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SiloProvider } from "@/core/SiloContext";
import { checkServerHealth } from "./services/healthService";

registerSW({ immediate: true });

checkServerHealth()
  .then((data) => {
    console.log("Server health:", data);
  })
  .catch((err) => {
    console.error("Server connection failed:", err);
  });


const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);

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
