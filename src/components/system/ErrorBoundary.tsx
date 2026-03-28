import React from "react";
import { logger } from "@/utils/logger";

interface State {
  hasError: boolean;
}

type ErrorBoundaryProps = React.PropsWithChildren<{
  fallback?: React.ReactNode;
}>;

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    logger.error("Portal Error:", { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: "2rem" }}>
          <div role="alert">Unexpected error</div>
          <p>Please refresh or contact admin.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
