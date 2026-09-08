import React from "react";
import { logger } from "@/utils/logger";

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

type ErrorBoundaryProps = React.PropsWithChildren<{
  fallback?: React.ReactNode;
}>;

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, errorMessage: error instanceof Error ? error.message : String(error ?? "Unknown error") };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    // Surface to browser console for immediate debugging context.
    console.error("Portal ErrorBoundary caught:", error, errorInfo);
    logger.error("Portal Error:", { error, errorInfo });
  }

  // BF_PORTAL_ERROR_BOUNDARY_v1 - a caught error left staff on a dead screen
  // showing a raw exception string with no way forward but a manual browser
  // reload. Clearing the state remounts the subtree, which recovers from a
  // transient render error without losing the session.
  reset = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div role="alert" style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 8px" }}>Something went wrong on this screen</h2>
          <p style={{ margin: "0 0 16px", color: "#64748b" }}>
            The rest of the portal is still available. Try again, or move to another section.
          </p>
          <button onClick={this.reset}>Try again</button>
          {/* The message is for us, not the user: keep it available but quiet. */}
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", color: "#64748b" }}>Technical detail</summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
              {this.state.errorMessage ?? "Unknown error"}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
