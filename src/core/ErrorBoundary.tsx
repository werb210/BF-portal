import React, { type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: null };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, errorMessage: error instanceof Error ? error.message : String(error ?? "Unknown error") };
  }

  render() {
    if (this.state.hasError) {
      return <div role="alert">System error logged: {this.state.errorMessage ?? "Unknown error"}</div>;
    }

    return this.props.children;
  }
}
