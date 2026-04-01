import React from "react";
import { getRequestId } from "@/utils/requestId";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

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
      return <div role="alert">System error</div>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
