import React from "react";
import { getRequestId } from "@/utils/requestId";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("UI render failure", {
      requestId: getRequestId(),
      error,
      info
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.state.error?.message === "AUTH_REQUIRED") {
        return null;
      }

      return (
        <div style={{ padding: 40 }} role="alert">
          <h2>Portal Error</h2>
          <p>Unexpected error.</p>
          <p>Please refresh the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
