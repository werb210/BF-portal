import React from "react";
import { logger } from "@/utils/logger";
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        logger.error("Portal Error:", { error, errorInfo });
    }
    render() {
        if (this.state.hasError) {
            throw new Error("UI_FATAL_ERROR");
        }
        return this.props.children;
    }
}
