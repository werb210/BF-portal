import { registerSW } from "virtual:pwa-register";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SiloProvider } from "@/core/SiloContext";
import { checkServerHealth } from "./services/healthService";

registerSW({ immediate: true });

void checkServerHealth().then((data) => {
  console.log("Server health:", data);
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
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SiloProvider>
    </React.StrictMode>
  );
} else {
  root.render(
    <SiloProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SiloProvider>
  );
}
