import React from "react";
import { getRequestId } from "@/utils/requestId";

export class ErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    console.error("UI render failure", { requestId: getRequestId() });
  }

  render() {
    if (this.state.hasError) {
      return <div role="alert">Unexpected error</div>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
