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

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div role="alert">System error logged: {this.state.errorMessage ?? "Unknown error"}</div>;
    }

    return this.props.children;
  }
}
