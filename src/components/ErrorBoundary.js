import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return _jsx("div", { role: "alert", children: "Something went wrong. System error." });
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
