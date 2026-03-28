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
      throw new Error("UI_FATAL_ERROR");
    }

    return this.props.children;
  }
}
