import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
export default class ErrorBoundary extends React.Component {
    state = { hasError: false };
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return _jsx("div", { children: "System error logged." });
        }
        return this.props.children;
    }
}
