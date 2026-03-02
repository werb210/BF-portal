import React from "react";
import { logger } from "@/utils/logger";

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
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
