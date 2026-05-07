// BF_PORTAL_BLOCK_v171_DRAWER_TABS_PROP_AND_BOUNDARY_v1
// Inline error boundary for individual drawer tabs. Without this, any
// runtime exception during a tab's render bubbles to React's root,
// React unmounts the subtree, and the staff sees "blank screen". Now
// the boundary catches it, logs to console with the tab id, and
// renders a visible error panel with the message + first 6 lines of
// the component stack so we can actually see what's wrong.
import { Component, type ErrorInfo, type ReactNode } from "react";

// BF_PORTAL_BLOCK_v172_TAB_BOUNDARY_RESET_ON_APP_CHANGE_v1
// applicationId is part of the reset key so opening a different
// application on the same tab clears the boundary's stuck error
// state. Without it, a render crash on application A would poison
// tab T for every application opened afterwards until the staff
// switched tabs and back. tabId is still part of the key for the
// original tab-switch reset.
type Props = { tabId: string; applicationId?: string | null; children: ReactNode };
type State = { error: Error | null; info: ErrorInfo | null };

export class TabErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(
      `[drawer-tab:${this.props.tabId}:app=${this.props.applicationId ?? "none"}] render crash`,
      error,
      info,
    );
    this.setState({ error, info });
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.state.error) return;
    // Reset on either tab switch OR application change so a crash on
    // application A's financials doesn't keep showing the red panel
    // when staff opens application B and clicks the same tab.
    const tabChanged = prevProps.tabId !== this.props.tabId;
    const appChanged = prevProps.applicationId !== this.props.applicationId;
    if (tabChanged || appChanged) {
      this.setState({ error: null, info: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          data-testid={`drawer-tab-error-${this.props.tabId}`}
          style={{
            padding: 16,
            margin: 12,
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            borderRadius: 8,
            color: "#7f1d1d",
            fontSize: 13,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, fontFamily: "system-ui" }}>
            {this.props.tabId} tab crashed
          </div>
          <div>{this.state.error.message}</div>
          {this.state.info?.componentStack ? (
            <pre style={{ marginTop: 8, fontSize: 11, whiteSpace: "pre-wrap", color: "#991b1b" }}>
              {this.state.info.componentStack.trim().split("\n").slice(0, 6).join("\n")}
            </pre>
          ) : null}
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}

export default TabErrorBoundary;
