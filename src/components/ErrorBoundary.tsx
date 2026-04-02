import React from "react";
import { getRequestId } from "@/utils/requestId";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export function ErrorFallback() {
  return <div role="alert">Something went wrong. System error.</div>;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("UI render failure", {
      requestId: getRequestId(),
      error,
      info,
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
