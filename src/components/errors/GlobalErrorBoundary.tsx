import { Component, type ErrorInfo, type ReactNode } from "react";
import Card from "@/components/ui/Card";
import { getLastApiRequest } from "@/state/apiRequestTrace";
import { getRequestId } from "@/utils/requestId";
import { logger } from "@/utils/logger";

type GlobalErrorBoundaryState = {
  errorId?: string;
  error?: Error;
};

const createErrorId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `err_${Math.random().toString(36).slice(2, 10)}`;
};

class GlobalErrorBoundary extends Component<{ children: ReactNode }, GlobalErrorBoundaryState> {
  state: GlobalErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error) {
    return { error, errorId: createErrorId() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("GlobalErrorBoundary caught an error.", { requestId: getRequestId(), error, info });
  }

  render() {
    const { error, errorId } = this.state;
    if (!error) {
      return this.props.children;
    }

    const lastRequest = getLastApiRequest();
    const route = typeof window !== "undefined" ? window.location.pathname : "unknown";

    return (
      <div className="page">
        <Card title="Unexpected error">
          <div role="alert">Unexpected error</div>
          <div className="space-y-2 text-sm">
            <p>We hit an error while loading this page. Please try again or contact support.</p>
            <p>
              <strong>Error ID:</strong> {errorId}
            </p>
            <p>
              <strong>Route:</strong> {route}
            </p>
            <p>
              <strong>Last API request:</strong>{" "}
              {lastRequest
                ? `${lastRequest.method ?? "Unavailable"} ${lastRequest.path} (${lastRequest.status ?? "unknown"})${
                    lastRequest.requestId ? ` [${lastRequest.requestId}]` : ""
                  }`
                : "No recent request recorded."}
            </p>
          </div>
        </Card>
      </div>
    );
  }
}

export default GlobalErrorBoundary;
