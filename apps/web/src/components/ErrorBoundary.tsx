import { Component, type ErrorInfo, type ReactNode } from "react";
import { Logo } from "./Logo";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, details: ErrorInfo) {
    console.error("Cue could not render the current screen.", error, details.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="loading-screen error-state">
          <Logo />
          <h1>Let’s get Cue back on track.</h1>
          <p>Something unexpected interrupted this screen. Your account and saved answers are still safe.</p>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>Reload Cue</button>
        </main>
      );
    }
    return this.props.children;
  }
}
