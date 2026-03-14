import { registerSW } from "virtual:pwa-register";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SiloProvider } from "@/core/SiloContext";
import { checkServerHealth } from "./services/healthService";
import { installFetchGuard } from "./utils/fetchGuard";

registerSW({ immediate: true });
installFetchGuard();

void checkServerHealth().then((data) => {
  console.log("Server health:", data);
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <SiloProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SiloProvider>
  </React.StrictMode>
);
